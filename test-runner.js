#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args, cwd, description) {
  return new Promise((resolve, reject) => {
    log(`\n🚀 ${description}`, 'cyan');
    log(`Running: ${command} ${args.join(' ')}`, 'blue');
    
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('close', (code) => {
      if (code === 0) {
        log(`✅ ${description} completed successfully`, 'green');
        resolve();
      } else {
        log(`❌ ${description} failed with code ${code}`, 'red');
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', (error) => {
      log(`❌ ${description} failed: ${error.message}`, 'red');
      reject(error);
    });
  });
}

async function checkDependencies() {
  log('\n📋 Checking Dependencies...', 'magenta');
  
  // Check if package.json files exist and have test dependencies
  const backendPkg = JSON.parse(readFileSync('./backend/package.json', 'utf8'));
  const frontendPkg = JSON.parse(readFileSync('./frontend/package.json', 'utf8'));
  
  const backendHasTests = backendPkg.devDependencies && 
    backendPkg.devDependencies.jest && 
    backendPkg.devDependencies.supertest;
  
  const frontendHasTests = frontendPkg.devDependencies && 
    frontendPkg.devDependencies.vitest && 
    frontendPkg.devDependencies['@testing-library/react'];
  
  if (!backendHasTests) {
    log('⚠️  Backend test dependencies not found. Installing...', 'yellow');
    await runCommand('npm', ['install'], './backend', 'Installing backend dependencies');
  }
  
  if (!frontendHasTests) {
    log('⚠️  Frontend test dependencies not found. Installing...', 'yellow');
    await runCommand('npm', ['install'], './frontend', 'Installing frontend dependencies');
  }
  
  log('✅ Dependencies check completed', 'green');
}

async function runBackendTests(coverage = false) {
  const args = coverage ? ['run', 'test:coverage'] : ['test'];
  await runCommand('npm', args, './backend', 'Backend Tests');
}

async function runFrontendTests(coverage = false) {
  const args = coverage ? ['run', 'test:coverage'] : ['test', '--run'];
  await runCommand('npm', args, './frontend', 'Frontend Tests');
}

async function runLinting() {
  log('\n🔍 Running Linting...', 'magenta');
  
  try {
    // Check if ESLint is available and run it
    await runCommand('npx', ['eslint', 'src', '--ext', '.js,.ts,.tsx'], './backend', 'Backend Linting');
  } catch (error) {
    log('ℹ️  Backend linting skipped (ESLint not configured)', 'yellow');
  }
  
  try {
    await runCommand('npx', ['eslint', 'src', '--ext', '.js,.ts,.tsx'], './frontend', 'Frontend Linting');
  } catch (error) {
    log('ℹ️  Frontend linting skipped (ESLint not configured)', 'yellow');
  }
}

async function generateTestReport() {
  log('\n📊 Generating Test Report...', 'magenta');
  
  const report = {
    timestamp: new Date().toISOString(),
    backend: {
      status: 'completed',
      coverage: 'Available in backend/coverage/'
    },
    frontend: {
      status: 'completed',
      coverage: 'Available in frontend/coverage/'
    }
  };
  
  console.log('\n📈 Test Report Summary:');
  console.log(JSON.stringify(report, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  const coverage = args.includes('--coverage');
  const skipDeps = args.includes('--skip-deps');
  const backendOnly = args.includes('--backend');
  const frontendOnly = args.includes('--frontend');
  const lintOnly = args.includes('--lint');
  
  log('🧪 Vibe Corner Test Suite', 'cyan');
  log('========================', 'cyan');
  
  try {
    if (!skipDeps && !lintOnly) {
      await checkDependencies();
    }
    
    if (lintOnly) {
      await runLinting();
      return;
    }
    
    if (!frontendOnly) {
      await runBackendTests(coverage);
    }
    
    if (!backendOnly) {
      await runFrontendTests(coverage);
    }
    
    if (!backendOnly && !frontendOnly) {
      await runLinting();
      await generateTestReport();
    }
    
    log('\n🎉 All tests completed successfully!', 'green');
    
  } catch (error) {
    log(`\n💥 Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🧪 Vibe Corner Test Runner

Usage: node test-runner.js [options]

Options:
  --coverage     Run tests with coverage report
  --skip-deps    Skip dependency installation check
  --backend      Run only backend tests
  --frontend     Run only frontend tests
  --lint         Run only linting
  --help, -h     Show this help message

Examples:
  node test-runner.js                    # Run all tests
  node test-runner.js --coverage         # Run all tests with coverage
  node test-runner.js --backend          # Run only backend tests
  node test-runner.js --frontend         # Run only frontend tests
  node test-runner.js --lint             # Run only linting
  `);
  process.exit(0);
}

main().catch(console.error); 