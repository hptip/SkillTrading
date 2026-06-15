const { spawn } = require('child_process');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function runPrismaDbPush() {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['prisma', 'db', 'push', '--schema', 'prisma/schema.prisma'], {
      cwd: path.join(__dirname, '..'),
      env: process.env,
      stdio: 'inherit',
      shell: true,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`prisma db push exited with code ${code}`));
    });
  });
}

async function main() {
  const maxAttempts = Number(process.env.PRISMA_DB_PUSH_RETRIES || 6);
  const delayMs = Number(process.env.PRISMA_DB_PUSH_DELAY_MS || 5000);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      console.log(`Running Prisma DB push (attempt ${attempt}/${maxAttempts})...`);
      await runPrismaDbPush();
      console.log('Prisma DB push completed successfully.');
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error('Prisma DB push failed after all retries.', error);
        process.exit(1);
      }

      console.warn(`Prisma DB push failed on attempt ${attempt}. Retrying in ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

main();
