const databaseManager = require('../config/database');
const Order = require('../models/Order');

/**
 * Order Repository - Handles all order-related database operations
 */
class OrderRepository {
  /**
   * Create a new order with items
   */
  static async create(orderData) {
    const { error, value } = Order.validateCreate(orderData);
    if (error) {
      throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
    }

    const connection = await databaseManager.getConnection();
    try {
      await connection.beginTransaction();

      // Create order
      const order = new Order(value);
      order.generateOrderNumber();

      // Calculate totals
      let subtotal = 0;
      for (const item of value.items) {
        subtotal += item.price * item.quantity;
      }

      order.subtotal = subtotal;
      order.tax_amount = value.tax_amount || subtotal * 0.075; // 7.5% VAT
      order.calculateTotal();

      const [orderResult] = await connection.execute(
        `INSERT INTO orders (
          user_id, order_number, status, total_amount, subtotal, 
          tax_amount, shipping_amount, discount_amount, currency,
          payment_status, payment_method, shipping_address, 
          billing_address, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.user_id, order.order_number, order.status, order.total_amount,
          order.subtotal, order.tax_amount, order.shipping_amount, order.discount_amount,
          order.currency, order.payment_status, order.payment_method,
          JSON.stringify(order.shipping_address), 
          order.billing_address ? JSON.stringify(order.billing_address) : null,
          order.notes
        ]
      );

      const orderId = orderResult.insertId;

      // Create order items
      for (const item of value.items) {
        // Get product details
        const [productRows] = await connection.execute(
          'SELECT name, sku FROM products WHERE id = ?',
          [item.product_id]
        );

        if (productRows.length === 0) {
          throw new Error(`Product with ID ${item.product_id} not found`);
        }

        const product = productRows[0];
        const totalPrice = item.price * item.quantity;

        await connection.execute(
          `INSERT INTO order_items (
            order_id, product_id, product_name, product_sku,
            quantity, unit_price, total_price
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId, item.product_id, product.name, product.sku,
            item.quantity, item.price, totalPrice
          ]
        );
      }

      await connection.commit();
      return await this.findById(orderId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Find order by ID with items
   */
  static async findById(id) {
    const connection = await databaseManager.getConnection();
    try {
      // Get order
      const [orderRows] = await connection.execute(
        'SELECT * FROM orders WHERE id = ?',
        [id]
      );

      if (orderRows.length === 0) {
        return null;
      }

      const order = Order.fromDatabase(orderRows[0]);

      // Get order items
      const [itemRows] = await connection.execute(
        'SELECT * FROM order_items WHERE order_id = ? ORDER BY id',
        [id]
      );

      order.items = itemRows;

      return order;
    } finally {
      connection.release();
    }
  }

  /**
   * Find orders with pagination and filtering
   */
  static async findAll(queryParams = {}) {
    const {
      page = 1,
      limit = 10,
      sort_by = 'created_at',
      sort_order = 'DESC',
      status = '',
      payment_status = '',
      user_id = '',
      date_from = '',
      date_to = '',
      min_amount = '',
      max_amount = ''
    } = queryParams;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryValues = [];

    // Build WHERE conditions
    if (status) {
      whereConditions.push('status = ?');
      queryValues.push(status);
    }

    if (payment_status) {
      whereConditions.push('payment_status = ?');
      queryValues.push(payment_status);
    }

    if (user_id) {
      whereConditions.push('user_id = ?');
      queryValues.push(user_id);
    }

    if (date_from) {
      whereConditions.push('DATE(created_at) >= ?');
      queryValues.push(date_from);
    }

    if (date_to) {
      whereConditions.push('DATE(created_at) <= ?');
      queryValues.push(date_to);
    }

    if (min_amount) {
      whereConditions.push('total_amount >= ?');
      queryValues.push(min_amount);
    }

    if (max_amount) {
      whereConditions.push('total_amount <= ?');
      queryValues.push(max_amount);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const connection = await databaseManager.getConnection();
    try {
      // Get total count
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM orders ${whereClause}`,
        queryValues
      );
      const total = countResult[0].total;

      // Get orders with user information
      const [rows] = await connection.execute(
        `SELECT o.*, 
                u.first_name, u.last_name, u.email
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         ${whereClause} 
         ORDER BY o.${sort_by} ${sort_order}
         LIMIT ? OFFSET ?`,
        [...queryValues, parseInt(limit), parseInt(offset)]
      );

      const orders = rows.map(row => {
        const order = Order.fromDatabase(row);
        order.user = {
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email
        };
        return order;
      });

      return {
        data: orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Update order status
   */
  static async updateStatus(id, statusData) {
    const { error, value } = Order.validateStatusUpdate(statusData);
    if (error) {
      throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
    }

    const order = await this.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    const connection = await databaseManager.getConnection();
    try {
      const updateFields = ['status = ?'];
      const updateValues = [value.status];

      // Set shipped_at timestamp if status is shipped
      if (value.status === Order.STATUS.SHIPPED) {
        updateFields.push('shipped_at = CURRENT_TIMESTAMP');
      }

      // Set delivered_at timestamp if status is delivered
      if (value.status === Order.STATUS.DELIVERED) {
        updateFields.push('delivered_at = CURRENT_TIMESTAMP');
        if (!order.shipped_at) {
          updateFields.push('shipped_at = CURRENT_TIMESTAMP');
        }
      }

      // Add notes if provided
      if (value.notes) {
        updateFields.push('notes = ?');
        updateValues.push(value.notes);
      }

      updateValues.push(id);

      await connection.execute(
        `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(id, paymentData) {
    const { error, value } = Order.validatePaymentUpdate(paymentData);
    if (error) {
      throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
    }

    const order = await this.findById(id);
    if (!order) {
      throw new Error('Order not found');
    }

    const connection = await databaseManager.getConnection();
    try {
      const updateFields = ['payment_status = ?'];
      const updateValues = [value.payment_status];

      if (value.payment_reference) {
        updateFields.push('payment_reference = ?');
        updateValues.push(value.payment_reference);
      }

      if (value.notes) {
        updateFields.push('notes = ?');
        updateValues.push(value.notes);
      }

      updateValues.push(id);

      await connection.execute(
        `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  /**
   * Get order statistics
   */
  static async getStatistics() {
    const connection = await databaseManager.getConnection();
    try {
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
          COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
          COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pending_payments,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as average_order_value,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as orders_today,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as orders_this_week,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as orders_this_month
        FROM orders
      `);

      return stats[0];
    } finally {
      connection.release();
    }
  }

  /**
   * Get user's orders
   */
  static async findByUserId(userId, queryParams = {}) {
    const modifiedParams = { ...queryParams, user_id: userId };
    return await this.findAll(modifiedParams);
  }
}

module.exports = OrderRepository;
