#!/usr/bin/env node
import { execSync } from 'child_process';

console.log('🛑 Stopping ADL-AGENT...\n');

// Port 3978 - Agent server
// Port 56150 - Agent Playground

const ports = [3978, 56150];
const processNames = ['adl-teams-agent', 'agentsplayground', 'npm test'];

// Kill processes by port
ports.forEach(port => {
  try {
    console.log(`🔍 Checking port ${port}...`);
    const result = execSync(`lsof -ti :${port}`, { encoding: 'utf-8' }).trim();
    if (result) {
      const pids = result.split('\n').filter(pid => pid);
      pids.forEach(pid => {
        try {
          execSync(`kill -9 ${pid}`);
          console.log(`   ✅ Killed process ${pid} on port ${port}`);
        } catch (err) {
          console.log(`   ⚠️  Process ${pid} already terminated`);
        }
      });
    } else {
      console.log(`   ℹ️  No process on port ${port}`);
    }
  } catch (err) {
    console.log(`   ℹ️  No process on port ${port}`);
  }
});

// Kill by process name patterns
console.log('\n🔍 Checking for remaining ADL-AGENT processes...');
processNames.forEach(name => {
  try {
    execSync(`pkill -f "${name}"`, { stdio: 'ignore' });
    console.log(`   ✅ Killed ${name} process`);
  } catch (err) {
    // Process not found, that's fine
  }
});

console.log('\n✅ ADL-AGENT stopped!\n');
