require('dotenv').config({ path: '.env.local' });
const { Pool } = require('@neondatabase/serverless');
const p = new Pool({ connectionString: process.env.DATABASE_URL });
p.query("select column_name from information_schema.columns where table_name='saved_lessons'")
  .then((r) => console.log(r.rows.map((x) => x.column_name)))
  .finally(() => p.end());
