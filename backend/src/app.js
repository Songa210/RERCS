// Sets up Express: middleware and routes.
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const incidentRoutes = require('./routes/incidentRoutes');

const app = express();

app.use(cors());          // lets the React app call this server
app.use(express.json());  // lets the server read JSON sent by React

app.get('/', (req, res) => {
  res.json({ message: 'RERCS API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/incidents', incidentRoutes);

// If no route matched
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;
