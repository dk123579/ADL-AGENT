#!/usr/bin/env node
import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const agentDir = dirname(__dirname);

console.log('🚀 Starting ADL-AGENT...\n');

// Verify build exists
const distDir = join(agentDir, 'dist');
if (!fs.existsSync(distDir)) {
  console.log('📦 Building agent...');
  execSync('npm run build', { cwd: agentDir, stdio: 'inherit' });
}

// Verify .env file exists
const envFile = join(agentDir, '.env');
if (!fs.existsSync(envFile)) {
  console.error('❌ Error: .env file not found!');
  console.log('Please create .env file with ADL_MCP_SERVER_PATH');
  process.exit(1);
}

console.log('🤖 Starting agent server and playground...\n');

// Start the agent using npm test (which runs both server and playground)
const agent = spawn('npm', ['test'], {
  cwd: agentDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

agent.on('exit', (code) => {
  if (code !== 0) {
    console.error(`\n❌ Agent exited with code ${code}`);
    process.exit(code);
  }
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down ADL-AGENT...');
  agent.kill();
  process.exit(0);
});

console.log('\n✅ ADL-AGENT starting!');
console.log('🤖 Agent Server: http://localhost:3978');
console.log('🎮 Agent Playground: http://localhost:56150');
console.log('\n💡 Use @ADL to capture decisions in Teams or Playground\n');
