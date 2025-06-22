const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Testing MySQL connection...');
  console.log(`Host: ${process.env.DB_HOST}`);
  console.log(`Port: ${process.env.DB_PORT}`);
  console.log(`User: ${process.env.DB_USER}`);
  console.log(`Database: ${process.env.DB_NAME}`);
  
  try {
    // First, connect without specifying database to create it if needed
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('✅ Connected to MySQL server successfully!');

    // Create database if it doesn't exist
    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'my_backend_db'}`);
    console.log(`✅ Database '${process.env.DB_NAME || 'my_backend_db'}' is ready!`);

    // Test connection to the specific database
    await connection.changeUser({
      database: process.env.DB_NAME || 'my_backend_db'
    });
    console.log('✅ Successfully connected to the application database!');

    await connection.end();
    
    console.log('\n🎉 MySQL is ready for your backend project!');
    console.log('\nNext steps:');
    console.log('1. npm run migrate  (create tables)');
    console.log('2. npm run seed     (add sample data)');
    console.log('3. npm run dev      (start the server)');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure MySQL service is running');
    console.log('2. Check your .env file credentials');
    console.log('3. Verify MySQL was installed with root password: "password"');
  }
}

testConnection();
