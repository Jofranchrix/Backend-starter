/**
 * Test categories endpoint specifically
 */

const http = require('http');

function testCategories() {
  console.log('🧪 Testing Categories endpoint...');

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/categories',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`✅ Categories endpoint responded with status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log('✅ Categories Response:', response);
        process.exit(0);
      } catch (error) {
        console.error('❌ Failed to parse response:', data);
        process.exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error connecting to categories endpoint:', error.message);
    process.exit(1);
  });

  req.setTimeout(10000, () => {
    console.error('❌ Request timeout - categories endpoint not responding');
    req.destroy();
    process.exit(1);
  });

  req.end();
}

testCategories();
