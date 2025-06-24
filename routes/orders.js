const express = require('express');
const OrderRepository = require('../repositories/OrderRepository');
const { authenticate, managerOrAdmin, ownerOrAdmin, customerOrHigher } = require('../middleware/auth');
const Order = require('../models/Order');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         user_id:
 *           type: integer
 *         order_number:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled, refunded]
 *         total_amount:
 *           type: number
 *         subtotal:
 *           type: number
 *         tax_amount:
 *           type: number
 *         shipping_amount:
 *           type: number
 *         discount_amount:
 *           type: number
 *         currency:
 *           type: string
 *         payment_status:
 *           type: string
 *           enum: [pending, paid, failed, refunded, partially_refunded]
 *         payment_method:
 *           type: string
 *         shipping_address:
 *           type: object
 *         billing_address:
 *           type: object
 *         notes:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *     OrderItem:
 *       type: object
 *       properties:
 *         product_id:
 *           type: integer
 *         quantity:
 *           type: integer
 *         price:
 *           type: number
 *     CreateOrderRequest:
 *       type: object
 *       required:
 *         - user_id
 *         - items
 *         - shipping_address
 *         - payment_method
 *       properties:
 *         user_id:
 *           type: integer
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *         shipping_address:
 *           type: object
 *         billing_address:
 *           type: object
 *         payment_method:
 *           type: string
 *         notes:
 *           type: string
 *         discount_amount:
 *           type: number
 *         shipping_amount:
 *           type: number
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders (Admin/Manager) or user's orders (Customer)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled, refunded]
 *       - in: query
 *         name: payment_status
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed, refunded, partially_refunded]
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *         description: Admin/Manager only - filter by user
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: min_amount
 *         schema:
 *           type: number
 *       - in: query
 *         name: max_amount
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 */
router.get('/', customerOrHigher, async (req, res) => {
  try {
    let queryParams = req.query;

    // If user is customer, only show their orders
    if (req.user.role === 'customer') {
      queryParams = { ...queryParams, user_id: req.user.id };
    }

    const result = await OrderRepository.findAll(queryParams);

    res.json({
      message: 'Orders retrieved successfully',
      data: result.data.map(order => order.toJSON()),
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get orders error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve orders'
    });
  }
});

/**
 * @swagger
 * /api/orders/statistics:
 *   get:
 *     summary: Get order statistics (Admin/Manager only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/statistics', managerOrAdmin, async (req, res) => {
  try {
    const stats = await OrderRepository.getStatistics();

    res.json({
      message: 'Order statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Order statistics error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve statistics'
    });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *       404:
 *         description: Order not found
 */
router.get('/:id', customerOrHigher, async (req, res) => {
  try {
    const order = await OrderRepository.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Order not found'
      });
    }

    // Check if user can access this order
    if (req.user.role === 'customer' && order.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own orders'
      });
    }

    res.json({
      message: 'Order retrieved successfully',
      data: order.toJSON()
    });
  } catch (error) {
    console.error('Get order error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve order'
    });
  }
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create new order
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', customerOrHigher, async (req, res) => {
  try {
    // If user is customer, set user_id to their own ID
    if (req.user.role === 'customer') {
      req.body.user_id = req.user.id;
    }

    const order = await OrderRepository.create(req.body);

    res.status(201).json({
      message: 'Order created successfully',
      data: order.toJSON()
    });
  } catch (error) {
    console.error('Create order error:', error.message);
    
    if (error.message.includes('Validation error')) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message
      });
    }
    
    if (error.message.includes('Product') && error.message.includes('not found')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create order'
    });
  }
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Update order status (Manager/Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, processing, shipped, delivered, cancelled, refunded]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Order not found
 */
router.put('/:id/status', managerOrAdmin, async (req, res) => {
  try {
    const order = await OrderRepository.updateStatus(req.params.id, req.body);

    res.json({
      message: 'Order status updated successfully',
      data: order.toJSON()
    });
  } catch (error) {
    console.error('Update order status error:', error.message);
    
    if (error.message.includes('Validation error')) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message
      });
    }
    
    if (error.message.includes('Order not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Order not found'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update order status'
    });
  }
});

/**
 * @swagger
 * /api/orders/{id}/payment:
 *   put:
 *     summary: Update payment status (Manager/Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - payment_status
 *             properties:
 *               payment_status:
 *                 type: string
 *                 enum: [pending, paid, failed, refunded, partially_refunded]
 *               payment_reference:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Order not found
 */
router.put('/:id/payment', managerOrAdmin, async (req, res) => {
  try {
    const order = await OrderRepository.updatePaymentStatus(req.params.id, req.body);

    res.json({
      message: 'Payment status updated successfully',
      data: order.toJSON()
    });
  } catch (error) {
    console.error('Update payment status error:', error.message);
    
    if (error.message.includes('Validation error')) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message
      });
    }
    
    if (error.message.includes('Order not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Order not found'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update payment status'
    });
  }
});

module.exports = router;
