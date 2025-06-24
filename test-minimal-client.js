/**
 * Test client for minimal server
 */

const http = require('http');

async function testEndpoint(path, description) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Testing ${description}...`);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log(`✅ ${description} - Status: ${res.statusCode}`);
          console.log(`   Response:`, response);
          resolve(response);
        } catch (error) {
          console.error(`❌ ${description} - Failed to parse response:`, data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error(`❌ ${description} - Connection error:`, error.message);
      reject(error);
    });

    req.setTimeout(5000, () => {
      console.error(`❌ ${description} - Timeout`);
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

async function runTests() {
  try {
    await testEndpoint('/test', 'Basic Test');
    await testEndpoint('/test-db', 'Database Connection');
    await testEndpoint('/test-categories-table', 'Categories Table');
    
    console.log('\n🎉 All minimal tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
