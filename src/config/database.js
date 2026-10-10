import mysql from 'mysql2/promise';
import { env } from './env.js';

const pool = mysql.createPool(env.db);

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
