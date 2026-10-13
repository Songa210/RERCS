// Starts the server. Run it with: npm run dev
require('dotenv').config();
const app = require('./src/app');
const pool = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// First test the database connection, then start listening
pool
  .query('SELECT NOW()')
  .then(() => {
    console.log('Connected to PostgreSQL database');
    app.listen(PORT, () => {
      console.log(`RERCS server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Could not connect to the database:', err.message);
    console.error('Check the DB_ values in your .env file.');
  });
