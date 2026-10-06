import dotenv from 'dotenv';

dotenv.config();

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to run the development seed script in production.');
  process.exit(1);
}

const { db } = await import('../src/server/db/database.ts');
db.seedForDevelopment();
