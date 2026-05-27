import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const apiDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(apiDir, '../..');

function run(command: string, args: string[], cwd: string): Promise<void> {
    return new Promise((resolveProcess, rejectProcess) => {
        const child = spawn(command, args, {
            cwd,
            env: process.env,
            stdio: 'inherit',
        });

        child.on('error', rejectProcess);
        child.on('exit', (code) => {
            if (code === 0) {
                resolveProcess();
                return;
            }

            rejectProcess(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`));
        });
    });
}

export async function setup() {
    config({ path: resolve(apiDir, '.env.test') });

    await run(
        'docker',
        [
            'compose',
            '-f',
            resolve(repoRoot, 'docker-compose.e2e.yml'),
            '--project-name',
            'alentapp-e2e',
            'up',
            '-d',
            '--wait',
            'db-test',
        ],
        repoRoot,
    );

    await run(
        'npx',
        ['prisma', 'migrate', 'deploy', '--config', 'prisma.config.ts'],
        apiDir,
    );
}
