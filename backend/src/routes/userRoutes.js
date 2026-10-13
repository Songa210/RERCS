const express = require('express');
const router = express.Router();
const {
  createUser, getUsers, deleteUser, getResponders,
} = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// :id must be a number
router.param('id', (req, res, next, value) => {
  if (!/^\d+$/.test(value)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  next();
});

router.use(verifyToken); // everything below needs login

// Dispatchers need to see responders when assigning
router.get('/responders', requireRole('dispatcher', 'admin'), getResponders);

// Admin only
router.get('/', requireRole('admin'), getUsers);
router.post('/', requireRole('admin'), createUser);
router.delete('/:id', requireRole('admin'), deleteUser);

module.exports = router;
