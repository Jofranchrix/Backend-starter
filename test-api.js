/**
 * Simple API Test Script
 * Tests the enhanced backend endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Testing Enhanced Backend API...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data.status);

    // Test 2: Get Categories (Public)
    console.log('\n2️⃣ Testing Categories (Public)...');
    const categoriesResponse = await axios.get(`${BASE_URL}/api/categories`);
    console.log('✅ Categories:', categoriesResponse.data.data.length, 'categories found');

    // Test 3: Login as Admin
    console.log('\n3️⃣ Testing Admin Login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'Password123!'
    });
    console.log('✅ Admin Login:', loginResponse.data.user.role);
    const adminToken = loginResponse.data.token;

    // Test 4: Get User Profile
    console.log('\n4️⃣ Testing User Profile...');
    const profileResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Profile:', profileResponse.data.user.email);

    // Test 5: Get Dashboard (Admin only)
    console.log('\n5️⃣ Testing Admin Dashboard...');
    const dashboardResponse = await axios.get(`${BASE_URL}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Dashboard:', 'Total Users:', dashboardResponse.data.data.summary.total_users);

    // Test 6: Get Orders
    console.log('\n6️⃣ Testing Orders...');
    const ordersResponse = await axios.get(`${BASE_URL}/api/orders`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Orders:', ordersResponse.data.data.length, 'orders found');

    // Test 7: Create a Customer
    console.log('\n7️⃣ Testing Customer Registration...');
    const customerData = {
      email: `test${Date.now()}@example.com`,
      password: 'Password123!',
      first_name: 'Test',
      last_name: 'Customer'
    };
    
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, customerData);
    console.log('✅ Customer Registration:', registerResponse.data.user.role);
    const customerToken = registerResponse.data.token;

    // Test 8: Create an Order as Customer
    console.log('\n8️⃣ Testing Order Creation...');
    const orderData = {
      items: [
        {
          product_id: 1,
          quantity: 1,
          price: 120.00
        }
      ],
      shipping_address: {
        first_name: 'Test',
        last_name: 'Customer',
        address_line_1: '123 Test Street',
        city: 'Lagos',
        state: 'Lagos',
        postal_code: '100001',
        country: 'Nigeria'
      },
      payment_method: 'card'
    };

    const orderResponse = await axios.post(`${BASE_URL}/api/orders`, orderData, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    console.log('✅ Order Creation:', orderResponse.data.data.order_number);

    // Test 9: System Health (Admin only)
    console.log('\n9️⃣ Testing System Health...');
    const healthAdminResponse = await axios.get(`${BASE_URL}/api/admin/system/health`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ System Health:', healthAdminResponse.data.data.status);

    console.log('\n🎉 All tests passed! Enhanced backend is working perfectly!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Run tests
testAPI();
