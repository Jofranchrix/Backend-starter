# My Backend Project

Enterprise-grade Node.js backend API with MySQL database integration, built with modern best practices for mission-critical systems.

## 🚀 Features

- **RESTful API** with Express.js
- **MySQL Database** with connection pooling and enterprise-grade configuration
- **Data Validation** using Joi schemas
- **Repository Pattern** for clean data access layer
- **Health Checks** and monitoring endpoints
- **Database Migrations** and seeding system
- **Comprehensive Error Handling** with proper HTTP status codes
- **Security Middleware** (Helmet, CORS, Rate limiting ready)
- **API Documentation** with Swagger/OpenAPI
- **Logging** with Winston
- **Environment Configuration** with validation
- **Graceful Shutdown** handling
- **Database Testing** utilities

## 📋 Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd my-backend-project
npm install
```

### 2. Database Setup

#### Option A: Local MySQL Installation
1. Install MySQL on your system
2. Create a database:
```sql
CREATE DATABASE my_backend_db;
CREATE USER 'your_username'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON my_backend_db.* TO 'your_username'@'localhost';
FLUSH PRIVILEGES;
```

#### Option B: Docker MySQL (Recommended for Development)
```bash
docker run --name mysql-dev \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=my_backend_db \
  -p 3306:3306 \
  -d mysql:8.0
```

### 3. Environment Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Update `.env` with your database credentials:
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=my_backend_db
DB_USER=your_username
DB_PASSWORD=your_password

# Security (IMPORTANT: Change in production!)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

### 4. Database Migration and Seeding

```bash
# Run database migrations
npm run migrate

# Seed with sample data (optional)
npm run seed

# Or do both at once
npm run setup
```

### 5. Start the Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## 📚 API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:3000/api-docs`
- **Health Check**: `http://localhost:3000/health`
- **Database Health**: `http://localhost:3000/health/database`
- **Metrics**: `http://localhost:3000/metrics`

## 🔧 Available Scripts

```bash
npm start              # Start production server
npm run dev            # Start development server with auto-reload
npm run migrate        # Run database migrations
npm run migrate:rollback <name>  # Rollback specific migration
npm run seed           # Seed database with sample data
npm run seed:clear     # Clear all products from database
npm run seed:reset     # Clear and re-seed database
npm run test           # Run database connectivity tests
npm run setup          # Run migrations and seeding (first-time setup)
```

## 🏗️ Project Structure

```
my-backend-project/
├── config/
│   ├── database.js          # Database connection and pool management
│   └── index.js             # Environment configuration with validation
├── database/
│   ├── migrations/          # Database migration files
│   │   └── 001_create_products_table.sql
│   ├── seeders/             # Database seeding utilities
│   │   └── ProductSeeder.js
│   └── migrate.js           # Migration runner
├── models/
│   └── Product.js           # Product model with validation schemas
├── repositories/
│   └── ProductRepository.js # Data access layer with repository pattern
├── tests/
│   └── database-test.js     # Database connectivity and functionality tests
├── .env.example             # Environment variables template
├── .env                     # Environment variables (not in git)
├── .gitignore              # Git ignore rules
├── index.js                # Main application entry point
└── package.json            # Dependencies and scripts
```

## 🔌 API Endpoints

### Products
- `GET /products` - List products with pagination and filtering
- `GET /products/:id` - Get single product by ID
- `POST /products` - Create new product
- `PUT /products/:id` - Update existing product
- `DELETE /products/:id` - Delete product (soft delete)

### Health & Monitoring
- `GET /health` - Basic health check
- `GET /health/database` - Database connectivity check
- `GET /metrics` - Application metrics

### Documentation
- `GET /api-docs` - Swagger UI documentation

## 🛡️ Security Features

- **Helmet.js** for security headers
- **CORS** configuration
- **Input validation** with Joi schemas
- **SQL injection protection** with parameterized queries
- **Environment variable validation**
- **Rate limiting ready** (configure in production)

## 🔍 Monitoring & Logging

- **Winston** for structured logging
- **Health check endpoints** for monitoring
- **Database connection pooling** with metrics
- **Graceful shutdown** handling
- **Error tracking** with proper HTTP status codes

## 🧪 Testing

Run the database tests to verify everything is working:

```bash
npm test
```

This will test:
- Database connectivity
- CRUD operations
- Data validation
- Pagination
- Transaction handling

## 🚀 Production Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000

# Database (use your production database)
DB_HOST=your-production-db-host
DB_USER=your-production-db-user
DB_PASSWORD=your-secure-password
DB_CONNECTION_LIMIT=20

# Security (CRITICAL: Use strong, unique values)
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# CORS (restrict to your frontend domain)
CORS_ORIGIN=https://your-frontend-domain.com
```

### Production Checklist

- [ ] Update all environment variables with production values
- [ ] Use strong, unique JWT secret
- [ ] Configure proper CORS origins
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (nginx/Apache)
- [ ] Set up monitoring and alerting
- [ ] Configure log rotation
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Review and test error handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details.

## 🆘 Troubleshooting

### Database Connection Issues

1. **Check MySQL is running**:
```bash
# On macOS/Linux
sudo systemctl status mysql

# On Windows
net start mysql
```

2. **Verify database credentials** in `.env` file

3. **Test connection manually**:
```bash
mysql -h localhost -u your_username -p my_backend_db
```

4. **Check firewall settings** if using remote database

### Common Errors

- **"Database not connected"**: Check your `.env` configuration and ensure MySQL is running
- **"Validation error"**: Check the API request body matches the expected schema
- **"Port already in use"**: Change the PORT in `.env` or stop the conflicting process

For more help, check the logs or run the health check endpoints.