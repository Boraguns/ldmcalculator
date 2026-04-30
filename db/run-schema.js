// One-shot: read schema.sql and execute against DATABASE_URL.
import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const text = fs.readFileSync(path.join(process.cwd(), 'db/schema.sql'), 'utf8');

// neon HTTP driver runs one statement per call. Split on semicolons (good
// enough since the schema has no embedded semicolons).
const stmts = text.split(/;\s*\n/).map(s => s.trim()).filter(s => s && !s.startsWith('--'));

for (const s of stmts) {
    const head = s.split('\n')[0].slice(0, 80);
    process.stdout.write('… ' + head + ' ');
    try {
        await sql.query(s);
        console.log('✓');
    } catch (e) {
        console.log('✗', e.message);
    }
}
console.log('done');
