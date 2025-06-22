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
      title: 'Simple API',
      version: '1.0.0',
      description: 'A simple Express API with Swagger'
    },
  },
  apis: ['./index.js'], // Swagger will look here for JSDoc comments
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
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Nike Air Max
 *               price:
 *                 type: number
 *                 example: 45000
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["shoes", "sport"]
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
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
