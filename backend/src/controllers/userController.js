// Admin tools: create/list/delete users, and list responders.
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

// POST /api/users  (admin only)
// Creates a dispatcher, responder or another admin.
exports.createUser = async (req, res) => {
  const {
    name, email, phone, address, password, role,
    responder_type, unit, badge_number, license_number, station,
  } = req.body;

  // ---- validation first ----
  if (!name || !email || !password || !role) {
    return res
      .status(400)
      .json({ message: 'Name, email, password and role are required' });
  }
  if (!['dispatcher', 'responder', 'admin'].includes(role)) {
    return res
      .status(400)
      .json({ message: 'Role must be dispatcher, responder or admin' });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: 'Password must be at least 6 characters' });
  }
  if (role === 'responder' && !['police', 'medical', 'fire'].includes(responder_type)) {
    return res
      .status(400)
      .json({ message: 'responder_type must be police, medical or fire' });
  }

  const client = await pool.connect();
  try {
    const cleanEmail = email.trim().toLowerCase();

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [
      cleanEmail,
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // A transaction = both inserts succeed together, or none of them do
    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (name, email, phone, address, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role`,
      [name, cleanEmail, phone || null, address || null, passwordHash, role]
    );
    const user = userResult.rows[0];

    if (role === 'responder') {
      await client.query(
        `INSERT INTO responders
           (user_id, responder_type, unit, badge_number, license_number, station)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.id, responder_type, unit || null, badge_number || null,
         license_number || null, station || null]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'User created', user });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

// GET /api/users  (admin only)
exports.getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, role, created_at
       FROM users ORDER BY id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/users/:id  (admin only)
exports.deleteUser = async (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (err) {
    // 23503 = this user is still linked to incidents
    if (err.code === '23503') {
      return res.status(409).json({
        message: 'This user has incident records and cannot be deleted',
      });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/users/responders?type=police&status=available  (dispatcher, admin)
exports.getResponders = async (req, res) => {
  try {
    const { type, status } = req.query;
    const conditions = [];
    const values = [];

    if (type) {
      values.push(type);
      conditions.push(`r.responder_type = $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`r.status = $${values.length}`);
    }

    let query = `
      SELECT r.id, u.name, u.phone, r.responder_type, r.unit, r.status
      FROM responders r
      JOIN users u ON u.id = r.user_id`;
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY u.name';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
