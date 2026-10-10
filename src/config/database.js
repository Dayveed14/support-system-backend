import mysql from 'mysql2/promise';
import { env } from './env.js';



function buildSslOption() {
  if (!env.db.ssl) return undefined;
  return {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
    ca: env.db.sslCaPath ? fs.readFileSync(env.db.sslCaPath) : undefined,
  };
}

const pool = mysql.createPool({
  ...env.db,
  ssl: buildSslOption()
});

export async function testDatabaseConnection() {
  const connection = await pool.getConnection();
  try {
    await connection.ping();
    console.log(`MySQL connected: ${env.db.database}`);
  } finally {
    connection.release();
  }
}

export default pool;
