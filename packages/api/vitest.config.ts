import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { configDefaults, defineConfig } from 'vitest/config';

const configDir = dirname(fileURLToPath(import.meta.url));
const isE2eRun = process.argv.some((arg) => arg.includes('.e2e.test.'));

config({ path: resolve(configDir, '.env.test') });

export default defineConfig({
    test: isE2eRun
        ? {
              globalSetup: ['./vitest.e2e.setup.ts'],
          }
        : {
              exclude: [...configDefaults.exclude, 'src/delivery/*.e2e.test.ts'],
          },
});
