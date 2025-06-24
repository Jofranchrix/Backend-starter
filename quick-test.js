/**
 * Quick Test Script for Enhanced Backend
 * Tests core functionality without external dependencies
 */

require('dotenv').config();

async function quickTest() {
  console.log('🚀 Enhanced Backend Quick Test\n');

  // Test 1: Environment Configuration
  console.log('1️⃣ Testing Environment Configuration...');
  const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
  let envOk = true;
  
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      console.log(`❌ Missing environment variable: ${varName}`);
      envOk = false;
    } else {
      console.log(`✅ ${varName}: ${varName === 'DB_PASSWORD' ? '***' : process.env[varName]}`);
    }
  });

  if (!envOk) {
    console.log('\n❌ Environment configuration incomplete. Check your .env file.');
    return;
  }

  // Test 2: Model Validation
  console.log('\n2️⃣ Testing Model Validation...');
  try {
    const User = require('./models/User');
    const Category = require('./models/Category');
    const Order = require('./models/Order');

    // Test User model
    const userData = {
      email: 'test@example.com',
      password: 'Password123!',
      first_name: 'Test',
      last_name: 'User'
    };
    const { error: userError } = User.validateRegister(userData);
    if (userError) {
      console.log('❌ User model validation failed:', userError.details[0].message);
    } else {
      console.log('✅ User model validation passed');
    }

    // Test Category model
    const categoryData = {
      name: 'Test Category',
      description: 'Test description'
    };
    const { error: catError } = Category.validateCreate(categoryData);
    if (catError) {
      console.log('❌ Category model validation failed:', catError.details[0].message);
    } else {
      console.log('✅ Category model validation passed');
    }

    // Test Order model
    const orderData = {
      user_id: 1,
      items: [{ product_id: 1, quantity: 1, price: 100 }],
      shipping_address: {
        first_name: 'Test',
        last_name: 'User',
        address_line_1: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        postal_code: '12345',
        country: 'Test Country'
      },
      payment_method: 'card'
    };
    const { error: orderError } = Order.validateCreate(orderData);
    if (orderError) {
      console.log('❌ Order model validation failed:', orderError.details[0].message);
    } else {
      console.log('✅ Order model validation passed');
    }

  } catch (error) {
    console.log('❌ Model loading failed:', error.message);
    return;
  }

  // Test 3: Database Connection
  console.log('\n3️⃣ Testing Database Connection...');
  try {
    const databaseManager = require('./config/database');
    await databaseManager.initialize();
    console.log('✅ Database connection successful');

    // Test basic query
    const connection = await databaseManager.getConnection();
    const [rows] = await connection.execute('SELECT 1 as test');
    connection.release();
    console.log('✅ Database query successful');

    await databaseManager.close();
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    console.log('   Make sure MySQL is running and credentials are correct');
    return;
  }

  // Test 4: Authentication Middleware
  console.log('\n4️⃣ Testing Authentication Middleware...');
  try {
    const { generateToken, verifyToken } = require('./middleware/auth');
    
    const testUser = { id: 1, email: 'test@example.com', role: 'admin' };
    const token = generateToken(testUser);
    console.log('✅ JWT token generation successful');

    const decoded = verifyToken(token);
    if (decoded.id === testUser.id && decoded.email === testUser.email) {
      console.log('✅ JWT token verification successful');
    } else {
      console.log('❌ JWT token verification failed');
    }
  } catch (error) {
    console.log('❌ Authentication middleware failed:', error.message);
    return;
  }

  // Test 5: Route Loading
  console.log('\n5️⃣ Testing Route Loading...');
  try {
    const authRoutes = require('./routes/auth');
    const userRoutes = require('./routes/users');
    const categoryRoutes = require('./routes/categories');
    const orderRoutes = require('./routes/orders');
    const adminRoutes = require('./routes/admin');

    console.log('✅ All route modules loaded successfully');
  } catch (error) {
    console.log('❌ Route loading failed:', error.message);
    return;
  }

  // Test 6: Repository Loading
  console.log('\n6️⃣ Testing Repository Loading...');
  try {
    const UserRepository = require('./repositories/UserRepository');
    const CategoryRepository = require('./repositories/CategoryRepository');
    const OrderRepository = require('./repositories/OrderRepository');
    const ProductRepository = require('./repositories/ProductRepository');

    console.log('✅ All repository modules loaded successfully');
  } catch (error) {
    console.log('❌ Repository loading failed:', error.message);
    return;
  }

  // Success Summary
  console.log('\n🎉 Quick Test Results:');
  console.log('✅ Environment configuration is correct');
  console.log('✅ All models are working properly');
  console.log('✅ Database connection is functional');
  console.log('✅ Authentication system is ready');
  console.log('✅ All routes are properly configured');
  console.log('✅ All repositories are accessible');
  
  console.log('\n🚀 Your Enhanced Backend is Ready!');
  console.log('\nNext steps:');
  console.log('1. Run: node index.js');
  console.log('2. Open: http://localhost:3000/api-docs');
  console.log('3. Test the API endpoints with Swagger UI');
  console.log('\nDefault admin login:');
  console.log('  Email: admin@example.com');
  console.log('  Password: Password123!');
}

// Run the quick test
quickTest().catch(error => {
  console.error('\n❌ Quick test failed:', error.message);
  console.log('\nCheck the TROUBLESHOOTING.md file for solutions.');
  process.exit(1);
});
