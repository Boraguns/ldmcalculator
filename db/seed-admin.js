// Seed/reset the initial admin user.
// Usage:
//   ADMIN_EMAIL=you@x.com ADMIN_PASSWORD=changeme DATABASE_URL=postgres://... node db/seed-admin.js
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const email = (process.env.ADMIN_EMAIL || 'admin@ldmcalculator.com').toLowerCase();
const password = process.env.ADMIN_PASSWORD || 'change-me-now';
const name = process.env.ADMIN_NAME || 'Admin';

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const hash = await bcrypt.hash(password, 10);

await sql`
    INSERT INTO admin_users (email, password_hash, name)
    VALUES (${email}, ${hash}, ${name})
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name
`;
console.log('admin upserted:', email);
