// Provision the SaaS-layer tables (db/saas-schema.sql).
// Usage:  DATABASE_URL=postgres://... node db/migrate-saas.js
//
// Robust statement splitter: strips full-line "--" comments first, then splits
// on semicolons, so leading comments never swallow a statement (unlike the
// older db/run-schema.js).
import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const raw = fs.readFileSync(path.join(process.cwd(), 'db/saas-schema.sql'), 'utf8');

const cleaned = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

const stmts = cleaned.split(';').map((s) => s.trim()).filter(Boolean);

let ok = 0, fail = 0;
for (const s of stmts) {
    const head = s.split('\n')[0].slice(0, 70);
    process.stdout.write('… ' + head + ' ');
    try {
        await sql.query(s);
        console.log('✓');
        ok++;
    } catch (e) {
        console.log('✗', e.message);
        fail++;
    }
}
console.log(`done — ${ok} ok, ${fail} failed`);
