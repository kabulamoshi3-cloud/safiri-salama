const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const suites = [
  {
    name: 'API gateway validation unit tests',
    cwd: 'services/api-gateway',
    command: 'npx',
    args: [
      'jest',
      '--runInBand',
      '--runTestsByPath',
      'src/__tests__/middleware/validation.unit.test.ts',
    ],
  },
  {
    name: 'Web platform unit tests',
    cwd: 'apps/web-platform',
    command: 'npm',
    args: ['test', '--', '--run'],
  },
  {
    name: 'ML traffic predictor unit tests',
    cwd: '.',
    command: 'python3',
    args: ['-m', 'unittest', 'discover', '-s', 'services/ml-service/tests', '-v'],
  },
];

let failed = false;
for (const suite of suites) {
  console.log(`\n=== ${suite.name} ===`);
  const result = spawnSync(suite.command, suite.args, {
    cwd: path.join(root, suite.cwd),
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(`${suite.name} could not start: ${result.error.message}`);
    failed = true;
  } else if (result.status !== 0) {
    console.error(`${suite.name} failed with exit code ${result.status}`);
    failed = true;
  }
}

process.exitCode = failed ? 1 : 0;
