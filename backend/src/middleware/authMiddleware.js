// Checkpoints that run BEFORE a controller.
const jwt = require('jsonwebtoken');

// 1. Is the user logged in? (has a valid token)
exports.verifyToken = (req, res, next) => {
  const header = req.headers.authorization; // "Bearer <token>"

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Please log in first' });
  }

  const token = header.split(' ')[1];

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, role, name }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// 2. Does the user have the right role?
// Example: requireRole('dispatcher', 'admin')
exports.requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res
      .status(403)
      .json({ message: 'You are not allowed to do this action' });
  }
  next();
};
