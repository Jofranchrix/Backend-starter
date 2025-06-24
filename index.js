const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

// Import configuration and database
const config = require('./config');
const databaseManager = require('./config/database');
const ProductRepository = require('./repositories/ProductRepository');

// Import route modules
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');

const app = express();
const port = config.port;

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin }));
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Advanced Backend API',
      version: '2.0.0',
      description: 'A comprehensive Express API with authentication, user management, and e-commerce features'
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Product ID',
              example: 1
            },
            name: {
              type: 'string',
              description: 'Product name',
              example: 'Nike Air Max 90'
            },
            price: {
              type: 'number',
              description: 'Product price',
              example: 45000
            },
            sku: {
              type: 'string',
              description: 'Stock Keeping Unit',
              example: 'NIKE-AM90-001'
            },
            description: {
              type: 'string',
              description: 'Product description',
              example: 'Classic Nike Air Max 90 sneakers'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Product tags',
              example: ['shoes', 'sport', 'nike']
            },
            stock_quantity: {
              type: 'integer',
              description: 'Available stock quantity',
              example: 100
            },
            is_active: {
              type: 'boolean',
              description: 'Whether the product is active',
              example: true
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
              example: '2025-06-24T17:00:00.000Z'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
              example: '2025-06-24T17:00:00.000Z'
            }
          }
        }
      }
    }
  },
  apis: ['./index.js', './routes/*.js'], // Swagger will look here for JSDoc comments
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// 🟢 GET endpoint
/**
 * @swagger
 * /hello:
 *   get:
 *     summary: Returns a greeting message
 *     responses:
 *       200:
 *         description: A greeting message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Hello from your backend!
 */
app.get('/hello', (req, res) => {
  res.json({ message: 'Hello from your backend!' });
});

// 🟢 Health check endpoints
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 environment:
 *                   type: string
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: require('./package.json').version
  });
});

/**
 * @swagger
 * /health/database:
 *   get:
 *     summary: Database health check
 *     responses:
 *       200:
 *         description: Database is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 database:
 *                   type: object
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                     pool:
 *                       type: object
 *       503:
 *         description: Database is unhealthy
 */
app.get('/health/database', async (req, res) => {
  try {
    const poolStatus = databaseManager.getPoolStatus();

    if (!poolStatus.connected) {
      return res.status(503).json({
        status: 'unhealthy',
        database: {
          connected: false,
          error: 'Database not connected'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Test database connectivity
    await databaseManager.testConnection();

    res.status(200).json({
      status: 'healthy',
      database: {
        connected: true,
        pool: {
          totalConnections: poolStatus.totalConnections,
          freeConnections: poolStatus.freeConnections,
          queuedRequests: poolStatus.queuedRequests
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error.message);

    res.status(503).json({
      status: 'unhealthy',
      database: {
        connected: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Basic application metrics
 *     responses:
 *       200:
 *         description: Application metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 memory:
 *                   type: object
 *                 uptime:
 *                   type: number
 *                 database:
 *                   type: object
 */
app.get('/metrics', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const poolStatus = databaseManager.getPoolStatus();

  res.status(200).json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
    },
    database: poolStatus,
    environment: config.env,
    nodeVersion: process.version
  });
});

// 🟢 GET endpoint for retrieving products
/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products with pagination and filtering
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in product name and description
 *       - in: query
 *         name: min_price
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: max_price
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [id, name, price, created_at]
 *           default: id
 *         description: Sort field
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Sort order
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Filter by tags (comma-separated)
 *         example: "shoes,sport"
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *         example: true
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Products retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 */
app.get('/products', async (req, res) => {
  try {
    const result = await ProductRepository.findAll(req.query);

    res.status(200).json({
      message: 'Products retrieved successfully',
      ...result
    });
  } catch (error) {
    console.error('Error retrieving products:', error.message);

    if (error.message.includes('Query validation error')) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve products'
    });
  }
});

// 🟢 GET endpoint for single product
/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       404:
 *         description: Product not found
 */
app.get('/products/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    if (isNaN(productId)) {
      return res.status(400).json({
        error: 'Invalid product ID',
        message: 'Product ID must be a valid number'
      });
    }

    const product = await ProductRepository.findById(productId);

    if (!product) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Product not found'
      });
    }

    res.status(200).json({
      message: 'Product retrieved successfully',
      data: product
    });
  } catch (error) {
    console.error('Error retrieving product:', error.message);

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve product'
    });
  }
});

// 🔵 POST endpoint
/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: Product name (required)
 *                 example: "Nike Air Max 90"
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 description: Product price (required)
 *                 example: 45000
 *               sku:
 *                 type: string
 *                 maxLength: 100
 *                 description: Stock Keeping Unit (optional, must be unique if provided)
 *                 example: "NIKE-AM90-001"
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Product description (optional)
 *                 example: "Classic Nike Air Max 90 sneakers with premium materials"
 *               tags:
 *                 type: array
 *                 maxItems: 10
 *                 items:
 *                   type: string
 *                   maxLength: 50
 *                 description: Product tags (optional, max 10 tags)
 *                 example: ["shoes", "sport", "nike", "sneakers"]
 *               stock_quantity:
 *                 type: integer
 *                 minimum: 0
 *                 description: Available stock quantity (optional, defaults to 0)
 *                 example: 100
 *               is_active:
 *                 type: boolean
 *                 description: Whether the product is active (optional, defaults to true)
 *                 example: true
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Validation Error"
 *                 message:
 *                   type: string
 *                   example: "Product name is required"
 *       409:
 *         description: Duplicate SKU error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Conflict"
 *                 message:
 *                   type: string
 *                   example: "SKU already exists"
 */
app.post('/products', async (req, res) => {
  try {
    const product = await ProductRepository.create(req.body);

    res.status(201).json({
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    console.error('Error creating product:', error.message);

    if (error.message.includes('Validation error')) {
      return res.status(400).json({
        error: 'Validation failed',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create product'
    });
  }
});

//Put endpoint
 /**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update an existing product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the product to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Updated Product Name
 *               price:
 *                 type: number
 *                 example: 50000
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["updated", "tag"]
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 */
app.put('/products/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    if (isNaN(productId)) {
      return res.status(400).json({
        error: 'Invalid product ID',
        message: 'Product ID must be a valid number'
      });
    }

    const product = await ProductRepository.update(productId, req.body);

    res.status(200).json({
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    console.error('Error updating product:', error.message);

    if (error.message.includes('Validation error')) {
      return res.status(400).json({
        error: 'Validation failed',
        message: error.message
      });
    }

    if (error.message === 'Product not found') {
      return res.status(404).json({
        error: 'Not found',
        message: 'Product not found'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update product'
    });
  }
});

// Delete Endpoint
/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the product to delete
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
app.delete('/products/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    if (isNaN(productId)) {
      return res.status(400).json({
        error: 'Invalid product ID',
        message: 'Product ID must be a valid number'
      });
    }

    await ProductRepository.delete(productId);

    res.status(200).json({
      message: `Product with ID ${productId} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting product:', error.message);

    if (error.message === 'Product not found') {
      return res.status(404).json({
        error: 'Not found',
        message: 'Product not found'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete product'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Swagger route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Database initialization and server startup
async function startServer() {
  try {
    // Initialize database connection
    console.log('Initializing database connection...');
    await databaseManager.initialize();
    console.log('✓ Database connected successfully');

    // Start server
    const server = app.listen(port, () => {
      console.log(`✓ Server is running on http://localhost:${port}`);
      console.log(`✓ Swagger docs available at http://localhost:${port}/api-docs`);
      console.log(`✓ Environment: ${config.env}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        console.log('HTTP server closed');

        try {
          await databaseManager.close();
          console.log('Database connections closed');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the application
startServer();
