# 🔧 **Troubleshooting Guide**

## 🚨 **Common Issues and Solutions**

### **1. Database Connection Issues**

If you encounter database connection errors, try these solutions:

#### **Check MySQL Service**
```bash
# Windows - Check if MySQL is running
net start mysql
# or
services.msc  # Look for MySQL service
```

#### **Verify Database Credentials**
Check your `.env` file:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=Bigubuntu@24
DB_NAME=my_backend_db
```

#### **Test Database Connection Manually**
```bash
mysql -u root -p
USE my_backend_db;
SHOW TABLES;
```

### **2. Server Startup Issues**

#### **Check for Port Conflicts**
```bash
# Windows - Check what's using port 3000
netstat -ano | findstr :3000
```

#### **Install Missing Dependencies**
```bash
npm install
```

#### **Clear Node Modules (if needed)**
```bash
rm -rf node_modules package-lock.json
npm install
```

### **3. API Testing Issues**

#### **Use Postman or Insomnia**
Instead of curl, use a GUI tool like Postman:

1. **Import the Swagger spec** from `http://localhost:3000/api-docs`
2. **Test endpoints** with proper headers
3. **Save authentication tokens** for reuse

#### **Test with Browser**
For GET endpoints, you can test directly in browser:
```
http://localhost:3000/health
http://localhost:3000/api/categories
```

### **4. Authentication Issues**

#### **Get JWT Token**
```javascript
// Use this in Postman or browser console
fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'Password123!'
  })
})
.then(res => res.json())
.then(data => console.log('Token:', data.token));
```

#### **Use Token in Requests**
Add to headers:
```
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

---

## 🛠️ **Step-by-Step Testing Guide**

### **Step 1: Basic Server Test**
```bash
node test-simple.js
# Should show: "Simple server running on http://localhost:3000"
```

### **Step 2: Database Test**
```bash
node test-minimal.js
# Should connect to database successfully
```

### **Step 3: Full Server Test**
```bash
node index.js
# Should show all services starting successfully
```

### **Step 4: API Test**
Open browser and go to:
```
http://localhost:3000/api-docs
```

---

## 🔍 **Debugging Tips**

### **1. Enable Detailed Logging**
Add to your `.env` file:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

### **2. Check Server Logs**
The server will show detailed logs including:
- Database connection status
- API request details
- Error messages

### **3. Test Individual Components**

#### **Test Database Only**
```javascript
// test-db-only.js
require('dotenv').config();
const databaseManager = require('./config/database');

async function testDB() {
  try {
    await databaseManager.initialize();
    console.log('✅ Database connected successfully');
    
    const connection = await databaseManager.getConnection();
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
    connection.release();
    
    console.log('✅ Users table accessible, count:', rows[0].count);
    process.exit(0);
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    process.exit(1);
  }
}

testDB();
```

#### **Test Models Only**
```javascript
// test-models.js
const User = require('./models/User');
const Category = require('./models/Category');

console.log('Testing User model...');
const userData = {
  email: 'test@example.com',
  password: 'Password123!',
  first_name: 'Test',
  last_name: 'User'
};

const { error } = User.validateCreate(userData);
if (error) {
  console.error('❌ User validation failed:', error.details);
} else {
  console.log('✅ User model validation passed');
}

console.log('Testing Category model...');
const categoryData = {
  name: 'Test Category',
  description: 'Test description'
};

const { error: catError } = Category.validateCreate(categoryData);
if (catError) {
  console.error('❌ Category validation failed:', catError.details);
} else {
  console.log('✅ Category model validation passed');
}
```

---

## 📞 **Getting Help**

### **1. Check Error Messages**
Look for specific error messages in the console output:
- `ECONNREFUSED` - Database connection refused
- `ER_ACCESS_DENIED` - Wrong database credentials
- `EADDRINUSE` - Port already in use
- `MODULE_NOT_FOUND` - Missing dependencies

### **2. Common Solutions**

#### **Database Not Running**
```bash
# Start MySQL service
net start mysql
```

#### **Wrong Password**
Update `.env` file with correct MySQL password

#### **Port in Use**
Change port in `config/index.js`:
```javascript
port: process.env.PORT || 3001  // Use different port
```

#### **Missing Tables**
Run migrations:
```bash
npm run migrate
npm run seed
```

---

## ✅ **Verification Checklist**

Before testing the enhanced backend, ensure:

- [ ] MySQL service is running
- [ ] Database `my_backend_db` exists
- [ ] All tables are created (run migrations)
- [ ] Sample data is loaded (run seeders)
- [ ] `.env` file has correct credentials
- [ ] All npm dependencies are installed
- [ ] Port 3000 is available
- [ ] No syntax errors in code files

---

## 🎯 **Quick Success Test**

If everything is working, this should succeed:

1. **Start server**: `node index.js`
2. **Open browser**: `http://localhost:3000/health`
3. **Should see**: `{"status":"healthy",...}`
4. **Open Swagger**: `http://localhost:3000/api-docs`
5. **Should see**: Complete API documentation

**If these work, your enhanced backend is fully operational!** 🚀
