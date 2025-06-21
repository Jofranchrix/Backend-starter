const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const port = 3000;

// 👇 This is important! Add middleware to parse JSON
app.use(express.json());

// Dummy product store
const products = [];

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
app.post('/products', (req, res) => {
  const newProduct = req.body;

  // Push to dummy list
  products.push(newProduct);

  res.status(201).json({
    message: 'Product created successfully',
    data: newProduct,
  });
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
app.put('/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const updatedData = req.body;

  // Find the product by index
  const index = products.findIndex((p, i) => i + 1 === productId);

  if (index === -1) {
    return res.status(404).json({ message: 'Product not found' });
  }

  // Update the product
  products[index] = { ...products[index], ...updatedData };

  res.status(200).json({
    message: 'Product updated successfully',
    data: products[index],
  });
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
app.delete('/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);

  const index = products.findIndex((p, i) => i + 1 === productId);

  if (index === -1) {
    return res.status(404).json({ message: 'Product not found' });
  }

  // Remove the product
  products.splice(index, 1);

  res.status(200).json({
    message: `Product with ID ${productId} deleted successfully`,
  });
});

// Swagger route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`Swagger docs available at http://localhost:${port}/api-docs`);
});
