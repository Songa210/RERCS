const express = require('express');
const router = express.Router();
const {
  createIncident, getIncidents, getIncidentById, getIncidentHistory,
  verifyIncident, assignResponder, updateStatus, closeIncident,
} = require('../controllers/incidentController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// :id must be a number
router.param('id', (req, res, next, value) => {
  if (!/^\d+$/.test(value)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  next();
});

router.use(verifyToken); // everything below needs login

router.post('/', requireRole('citizen'), createIncident);
router.get('/', getIncidents);
router.get('/:id', getIncidentById);
router.get('/:id/history', getIncidentHistory);

router.patch('/:id/verify', requireRole('dispatcher'), verifyIncident);
router.patch('/:id/assign', requireRole('dispatcher'), assignResponder);
router.patch('/:id/status', requireRole('responder'), updateStatus);
router.patch('/:id/close', requireRole('dispatcher'), closeIncident);

module.exports = router;
