/**
 * Simple test to check if server is responding
 */

const http = require('http');

function testServer() {
  console.log('🧪 Testing if server is responding...');

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/hello',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Server responded with status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ Response:', data);
      process.exit(0);
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error connecting to server:', error.message);
    process.exit(1);
  });

  req.setTimeout(5000, () => {
    console.error('❌ Request timeout - server not responding');
    req.destroy();
    process.exit(1);
  });

  req.end();
}

testServer();
