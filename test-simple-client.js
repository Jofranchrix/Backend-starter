/**
 * Test simple server
 */

const http = require('http');

function testSimple() {
  console.log('🧪 Testing Simple Server...');

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/simple',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Simple server responded with status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('✅ Simple Response:', response);
        console.log('🎉 Simple server is working!');
        process.exit(0);
      } catch (error) {
        console.error('❌ Failed to parse response:', data);
        process.exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error connecting to simple server:', error.message);
    process.exit(1);
  });

  req.setTimeout(5000, () => {
    console.error('❌ Request timeout');
    req.destroy();
    process.exit(1);
  });

  req.end();
}

testSimple();
