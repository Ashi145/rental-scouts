import dotenv from 'dotenv';
import readline from 'node:readline';
import { stdin, stdout } from 'node:process';

dotenv.config();

const prompt = (label: string) => new Promise<string>(resolve => {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  rl.question(label, answer => {
    rl.close();
    resolve(answer.trim());
  });
});

const promptHidden = (label: string) => new Promise<string>((resolve, reject) => {
  stdout.write(label);
  stdin.setRawMode?.(true);
  stdin.resume();
  let value = '';
  const onData = (chunk: Buffer) => {
    const key = chunk.toString();
    if (key === '\r' || key === '\n') {
      stdin.off('data', onData);
      stdin.setRawMode?.(false);
      stdout.write('\n');
      resolve(value);
    } else if (key === '\u0003') {
      stdin.off('data', onData);
      stdin.setRawMode?.(false);
      reject(new Error('Cancelled.'));
    } else if (key === '\u007f') {
      value = value.slice(0, -1);
    } else {
      value += key;
    }
  };
  stdin.on('data', onData);
});

async function main() {
  const email = (await prompt('Admin email: ')).toLowerCase();
  const fullName = await prompt('Full name: ');
  const password = await promptHidden('Password (input hidden): ');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !fullName || password.length < 10 || password.length > 128) {
    throw new Error('Provide a valid email, full name, and password between 10 and 128 characters.');
  }

  const { db, hashPassword } = await import('../src/server/db/database.ts');
  if (db.findUserByEmail(email)) throw new Error('An account with this email already exists.');
  const user = db.createUser({
    email,
    passwordHash: hashPassword(password),
    fullName,
    phone: '',
    role: 'ADMIN',
  });
  console.log(`Administrator created with ID ${user.id}. Store the password securely; it will not be shown again.`);
  process.exitCode = 0;
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Administrator creation failed.');
  process.exitCode = 1;
});
