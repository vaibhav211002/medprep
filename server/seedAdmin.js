require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const Admin = require('./models/Admin');

async function run() {
  await connectDB();

  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin';

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env before seeding.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await Admin.findOneAndUpdate(
    { email },
    { $set: { name, passwordHash } },
    { upsert: true, new: true }
  );

  console.log(`Admin ready: ${admin.email}`);
  console.log('You can now log in on the admin portal with the email/password from .env.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
