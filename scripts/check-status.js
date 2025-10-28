#!/usr/bin/env node

/**
 * Script to check the status of all services
 */

import http from 'http';

console.log('🔍 Checking AI Photobooth Status...\n');

// Check backend
function checkBackend() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3001/health', (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Backend: Running on http://localhost:3001');
        resolve(true);
      } else {
        console.log('❌ Backend: Not responding correctly');
        resolve(false);
      }
    });
    
    req.on('error', () => {
      console.log('❌ Backend: Not running (start with: npm run server)');
      resolve(false);
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      console.log('❌ Backend: Timeout');
      resolve(false);
    });
  });
}

// Check frontend
function checkFrontend() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:8080', (res) => {
      if (res.statusCode === 200) {
        console.log('✅ Frontend: Running on http://localhost:8080');
        resolve(true);
      } else {
        console.log('❌ Frontend: Not responding correctly');
        resolve(false);
      }
    });
    
    req.on('error', () => {
      console.log('❌ Frontend: Not running (start with: npm run dev)');
      resolve(false);
    });
    
    req.setTimeout(2000, () => {
      req.destroy();
      console.log('❌ Frontend: Timeout');
      resolve(false);
    });
  });
}

// Main
async function main() {
  const [backendOk, frontendOk] = await Promise.all([
    checkBackend(),
    checkFrontend()
  ]);
  
  console.log('\n📋 Summary:');
  if (backendOk && frontendOk) {
    console.log('✅ All services running correctly!');
    console.log('\n🌐 Open http://localhost:8080 to use the app');
  } else {
    console.log('⚠️  Some services are not running\n');
    console.log('To start all services run:');
    console.log('  npm run dev:full\n');
    console.log('Or start them separately:');
    console.log('  npm run server  (in terminal 1)');
    console.log('  npm run dev     (in terminal 2)');
  }
}

main();

