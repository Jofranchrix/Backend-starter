const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const port = 3000;

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
  apis: ['./index.js'], // Where Swagger looks for API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// GET route
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

// Swagger route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(3000, () => {
  console.log(`Server is running on http://localhost:3000`);
  console.log(`Swagger docs available at http://localhost:3000/api-docs`);
});
