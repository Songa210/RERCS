// Creates test accounts (admin, dispatcher, police responder).
// Run once with: npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

const PASSWORD = 'Password123';

const users = [
  { name: 'System Admin', email: 'admin@rercs.rw', role: 'admin' },
  { name: 'Test Dispatcher', email: 'dispatcher@rercs.rw', role: 'dispatcher' },
  {
    name: 'Test Police Officer',
    email: 'police@rercs.rw',
    role: 'responder',
    type: 'police',
    unit: 'Kigali Police Unit 1',
    badge: 'P-001',
  },
];

async function seed() {
  try {
    const hash = await bcrypt.hash(PASSWORD, 10);

    for (const u of users) {
      // ON CONFLICT DO NOTHING = skip if the email already exists
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [u.name, u.email, hash, u.role]
      );

      if (result.rows.length > 0 && u.role === 'responder') {
        await pool.query(
          `INSERT INTO responders (user_id, responder_type, unit, badge_number)
           VALUES ($1, $2, $3, $4)`,
          [result.rows[0].id, u.type, u.unit, u.badge]
        );
      }
      console.log(result.rows.length > 0 ? `Created: ${u.email}` : `Already exists: ${u.email}`);
    }

    console.log(`Done. Password for all test accounts: ${PASSWORD}`);
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
