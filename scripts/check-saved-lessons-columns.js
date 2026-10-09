async function main() {
  const { config } = await import("dotenv");
  config({ path: ".env.local" });
  const { Pool } = await import("@neondatabase/serverless");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const result = await pool.query(
      "select column_name from information_schema.columns where table_name='saved_lessons'"
    );
    console.log(result.rows.map((row) => row.column_name));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Unable to inspect saved lesson columns:", error);
  process.exitCode = 1;
});
