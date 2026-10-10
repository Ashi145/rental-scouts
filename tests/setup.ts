import os from 'node:os';
import path from 'node:path';

process.env.DATABASE_PATH = path.join(os.tmpdir(), `rental-scout-api-tests-${process.pid}.sqlite`);
