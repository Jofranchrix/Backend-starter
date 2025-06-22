const mysql = require('mysql2/promise');

const commonPasswords = [
  '',           // No password
  'password',   // What we set
  'root',       // Common default
  'admin',      // Another common one
  'mysql',      // MySQL default
  '123456',     // Simple password
];

async function tryPasswords() {
  console.log('🔍 Trying different MySQL passwords...\n');
  
  for (const password of commonPasswords) {
    try {
      console.log(`Trying password: "${password || '(empty)'}"`);
      
      const connection = await mysql.createConnection({
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: password,
        connectTimeout: 5000
      });
      
      console.log('✅ SUCCESS! Connected with password:', password || '(empty)');
      
      // Test a simple query
      const [rows] = await connection.execute('SELECT VERSION() as version');
      console.log('✅ MySQL Version:', rows[0].version);
      
      // Create our database
      await connection.execute('CREATE DATABASE IF NOT EXISTS my_backend_db');
      console.log('✅ Database "my_backend_db" created/verified');
      
      await connection.end();
      
      // Update .env file with working password
      const fs = require('fs');
      let envContent = fs.readFileSync('.env', 'utf8');
      envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${password}`);
      fs.writeFileSync('.env', envContent);
      
      console.log('\n🎉 SUCCESS! MySQL is working and .env file updated!');
      console.log('\nNext steps:');
      console.log('1. npm run migrate  (create tables)');
      console.log('2. npm run seed     (add sample data)');
      console.log('3. npm run dev      (start the server)');
      
      return;
      
    } catch (error) {
      console.log('❌ Failed:', error.message.split('\n')[0]);
    }
  }
  
  console.log('\n❌ None of the common passwords worked.');
  console.log('\n🔧 Next steps:');
  console.log('1. Try running MySQL installer again');
  console.log('2. Or reset MySQL root password manually');
  console.log('3. Check MySQL documentation for password reset');
}

tryPasswords();
