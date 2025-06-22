const { exec } = require('child_process');
const mysql = require('mysql2/promise');

// Try to connect with Windows authentication
async function tryWindowsAuth() {
  console.log('🔍 Trying Windows Authentication...');
  
  try {
    // Try connecting without password using Windows auth
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: process.env.USERNAME, // Windows username
      password: '',
      authPlugins: {
        mysql_clear_password: () => () => Buffer.from('')
      }
    });
    
    console.log('✅ Connected with Windows authentication!');
    await connection.end();
    return true;
  } catch (error) {
    console.log('❌ Windows auth failed:', error.message.split('\n')[0]);
    return false;
  }
}

// Check MySQL service and try to get more info
async function checkMySQLInfo() {
  console.log('🔍 Checking MySQL installation...\n');
  
  // Check if MySQL service is running
  exec('Get-Service -Name MySQL80', (error, stdout, stderr) => {
    if (error) {
      console.log('❌ MySQL service check failed');
    } else {
      console.log('✅ MySQL Service Status:');
      console.log(stdout);
    }
  });
  
  // Try Windows authentication
  await tryWindowsAuth();
  
  console.log('\n📋 Recommended Solutions:');
  console.log('1. Use MySQL Installer to reconfigure (EASIEST)');
  console.log('2. Reset password manually (see mysql-reset-guide.md)');
  console.log('3. Reinstall MySQL with known password');
  
  console.log('\n🎯 Next Step: Open MySQL Installer and click "Reconfigure"');
}

checkMySQLInfo();
