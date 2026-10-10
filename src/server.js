import app from './app.js';
import { env } from './config/env.js';
import { testDatabaseConnection } from './config/database.js';

try {
  await testDatabaseConnection();
  app.listen(env.port, () => console.log(`SupportDesk API listening on http://localhost:${env.port}`));
} catch (error) {
  console.error('Failed to start SupportDesk API:', error.message);
  process.exit(1);
}
