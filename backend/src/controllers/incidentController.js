// The heart of RERCS: report, verify, assign, update, close incidents.
// Status flow (from your state diagram):
// Reported -> Verified -> Assigned -> In Progress <-> Pending -> Completed -> Closed
// (a dispatcher can also reject a report: Reported -> Rejected)
const pool = require('../config/db');

// Which status changes a RESPONDER is allowed to make
const ALLOWED_TRANSITIONS = {
  Assigned: ['In Progress'],
  'In Progress': ['Pending', 'Completed'],
  Pending: ['In Progress'],
};

// Reusable query: an incident plus citizen and responder names
const BASE_QUERY = `
  SELECT i.*,
         c.name        AS citizen_name,
         c.phone       AS citizen_phone,
         r.user_id     AS responder_user_id,
         r.responder_type,
         ru.name       AS responder_name
  FROM incidents i
  JOIN users c          ON c.id = i.citizen_id
  LEFT JOIN responders r ON r.id = i.responder_id
  LEFT JOIN users ru     ON ru.id = r.user_id
`;

// Saves one line in the history table
const logUpdate = (db, incidentId, status, note, userId) =>
  db.query(
    `INSERT INTO incident_updates (incident_id, status, note, updated_by)
     VALUES ($1, $2, $3, $4)`,
    [incidentId, status, note, userId]
  );

// Is this user allowed to look at this incident?
const canView = (user, incident) => {
  if (user.role === 'citizen') return incident.citizen_id === user.id;
  if (user.role === 'responder') return incident.responder_user_id === user.id;
  return true; // dispatcher and admin see everything
};

// POST /api/incidents  (citizen)
exports.createIncident = async (req, res) => {
  try {
    const { type, location, latitude, longitude, description } = req.body;

    if (!type || !location || !description) {
      return res
        .status(400)
        .json({ message: 'Type, location and description are required' });
    }

    const result = await pool.query(
      `INSERT INTO incidents (citizen_id, type, location, latitude, longitude, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, type, location, latitude || null, longitude || null, description]
    );
    const incident = result.rows[0];

    await logUpdate(pool, incident.id, 'Reported', 'Emergency reported', req.user.id);

    res.status(201).json({ message: 'Emergency reported', incident });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/incidents?status=Reported  (everyone, but each role sees its own part)
exports.getIncidents = async (req, res) => {
  try {
    const { role, id } = req.user;
    const { status } = req.query;
    const conditions = [];
    const values = [];

    if (role === 'citizen') {
      values.push(id);
      conditions.push(`i.citizen_id = $${values.length}`);
    }
    if (role === 'responder') {
      values.push(id);
      conditions.push(`r.user_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`i.status = $${values.length}`);
    }

    let query = BASE_QUERY;
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY i.reported_at DESC';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/incidents/:id
exports.getIncidentById = async (req, res) => {
  try {
    const result = await pool.query(BASE_QUERY + ' WHERE i.id = $1', [req.params.id]);
    const incident = result.rows[0];

    if (!incident || !canView(req.user, incident)) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    res.json(incident);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/incidents/:id/history
exports.getIncidentHistory = async (req, res) => {
  try {
    const found = await pool.query(BASE_QUERY + ' WHERE i.id = $1', [req.params.id]);
    const incident = found.rows[0];

    if (!incident || !canView(req.user, incident)) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const result = await pool.query(
      `SELECT iu.id, iu.status, iu.note, iu.created_at, u.name AS updated_by_name
       FROM incident_updates iu
       LEFT JOIN users u ON u.id = iu.updated_by
       WHERE iu.incident_id = $1
       ORDER BY iu.created_at, iu.id`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/incidents/:id/verify  (dispatcher)
// Body: { "valid": true, "note": "Confirmed by phone call" }
exports.verifyIncident = async (req, res) => {
  try {
    const { valid, note } = req.body;

    if (typeof valid !== 'boolean') {
      return res.status(400).json({ message: '"valid" must be true or false' });
    }

    const found = await pool.query('SELECT * FROM incidents WHERE id = $1', [
      req.params.id,
    ]);
    const incident = found.rows[0];

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    if (incident.status !== 'Reported') {
      return res
        .status(400)
        .json({ message: 'Only reported incidents can be verified or rejected' });
    }

    const newStatus = valid ? 'Verified' : 'Rejected';

    const result = await pool.query(
      `UPDATE incidents
       SET status = $1, dispatcher_id = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [newStatus, req.user.id, incident.id]
    );

    await logUpdate(
      pool, incident.id, newStatus,
      note || (valid ? 'Incident verified' : 'Report rejected'),
      req.user.id
    );

    res.json({ message: `Incident ${newStatus.toLowerCase()}`, incident: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/incidents/:id/assign  (dispatcher)
// Body: { "responder_id": 1 }
exports.assignResponder = async (req, res) => {
  const { responder_id } = req.body;

  if (!responder_id) {
    return res.status(400).json({ message: 'responder_id is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // FOR UPDATE locks the rows so two dispatchers cannot assign the same responder
    const incResult = await client.query(
      'SELECT * FROM incidents WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );
    const incident = incResult.rows[0];

    if (!incident) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Incident not found' });
    }
    if (incident.status !== 'Verified') {
      await client.query('ROLLBACK');
      return res
        .status(400)
        .json({ message: 'Only verified incidents can be assigned' });
    }

    const respResult = await client.query(
      'SELECT * FROM responders WHERE id = $1 FOR UPDATE',
      [responder_id]
    );
    const responder = respResult.rows[0];

    if (!responder) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Responder not found' });
    }
    if (responder.status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This responder is not available' });
    }

    const updated = await client.query(
      `UPDATE incidents
       SET status = 'Assigned', responder_id = $1, dispatcher_id = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [responder.id, req.user.id, incident.id]
    );
    await client.query("UPDATE responders SET status = 'busy' WHERE id = $1", [
      responder.id,
    ]);
    await logUpdate(client, incident.id, 'Assigned', 'Responder assigned', req.user.id);

    await client.query('COMMIT');
    res.json({ message: 'Responder assigned', incident: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// PATCH /api/incidents/:id/status  (responder)
// Body: { "status": "In Progress", "note": "Arrived at the scene" }
exports.updateStatus = async (req, res) => {
  const { status, note } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Only the responder assigned to this incident can update it
    const result = await client.query(
      `SELECT i.*, r.id AS my_responder_id
       FROM incidents i
       JOIN responders r ON r.id = i.responder_id
       WHERE i.id = $1 AND r.user_id = $2
       FOR UPDATE OF i`,
      [req.params.id, req.user.id]
    );
    const incident = result.rows[0];

    if (!incident) {
      await client.query('ROLLBACK');
      return res
        .status(404)
        .json({ message: 'Incident not found or not assigned to you' });
    }

    const allowedNext = ALLOWED_TRANSITIONS[incident.status] || [];
    if (!allowedNext.includes(status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: `Cannot change status from "${incident.status}" to "${status}"`,
      });
    }

    const updated = await client.query(
      'UPDATE incidents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, incident.id]
    );

    // The responder is free again once the work is completed
    if (status === 'Completed') {
      await client.query("UPDATE responders SET status = 'available' WHERE id = $1", [
        incident.my_responder_id,
      ]);
    }

    await logUpdate(
      client, incident.id, status, note || `Status changed to ${status}`, req.user.id
    );

    await client.query('COMMIT');
    res.json({ message: 'Status updated', incident: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// PATCH /api/incidents/:id/close  (dispatcher)
// Body (optional): { "note": "All finished" }
exports.closeIncident = async (req, res) => {
  try {
    const found = await pool.query('SELECT * FROM incidents WHERE id = $1', [
      req.params.id,
    ]);
    const incident = found.rows[0];

    if (!incident) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    if (incident.status !== 'Completed') {
      return res
        .status(400)
        .json({ message: 'Only completed incidents can be closed' });
    }

    const result = await pool.query(
      `UPDATE incidents SET status = 'Closed', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [incident.id]
    );
    await logUpdate(
      pool, incident.id, 'Closed', req.body.note || 'Incident closed', req.user.id
    );

    res.json({ message: 'Incident closed', incident: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
