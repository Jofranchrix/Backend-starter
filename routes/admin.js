const express = require('express');
const UserRepository = require('../repositories/UserRepository');
const CategoryRepository = require('../repositories/CategoryRepository');
const OrderRepository = require('../repositories/OrderRepository');
const ProductRepository = require('../repositories/ProductRepository');
const { adminOnly, managerOrAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard data (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
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
 *                     users:
 *                       type: object
 *                     products:
 *                       type: object
 *                     categories:
 *                       type: object
 *                     orders:
 *                       type: object
 *                     summary:
 *                       type: object
 */
router.get('/dashboard', adminOnly, async (req, res) => {
  try {
    // Get all statistics in parallel
    const [userStats, productStats, categoryStats, orderStats] = await Promise.all([
      UserRepository.getStatistics(),
      ProductRepository.getStatistics(),
      CategoryRepository.getStatistics(),
      OrderRepository.getStatistics()
    ]);

    // Calculate summary metrics
    const summary = {
      total_users: userStats.total_users,
      total_products: productStats.total_products,
      total_categories: categoryStats.total_categories,
      total_orders: orderStats.total_orders,
      total_revenue: orderStats.total_revenue || 0,
      average_order_value: orderStats.average_order_value || 0,
      conversion_rate: userStats.total_users > 0 ? 
        ((orderStats.total_orders / userStats.total_users) * 100).toFixed(2) : 0,
      growth_metrics: {
        users_today: userStats.users_today,
        users_this_week: userStats.users_this_week,
        users_this_month: userStats.users_this_month,
        orders_today: orderStats.orders_today,
        orders_this_week: orderStats.orders_this_week,
        orders_this_month: orderStats.orders_this_month
      }
    };

    res.json({
      message: 'Dashboard data retrieved successfully',
      data: {
        users: userStats,
        products: productStats,
        categories: categoryStats,
        orders: orderStats,
        summary
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve dashboard data'
    });
  }
});

/**
 * @swagger
 * /api/admin/analytics/revenue:
 *   get:
 *     summary: Get revenue analytics (Admin/Manager only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, yearly]
 *           default: monthly
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Revenue analytics retrieved successfully
 */
router.get('/analytics/revenue', managerOrAdmin, async (req, res) => {
  try {
    const { period = 'monthly', start_date, end_date } = req.query;
    
    // Build date range
    let dateCondition = '';
    let dateParams = [];
    
    if (start_date && end_date) {
      dateCondition = 'WHERE DATE(created_at) BETWEEN ? AND ?';
      dateParams = [start_date, end_date];
    } else {
      // Default to last 30 days
      dateCondition = 'WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    }

    // Determine grouping based on period
    let groupBy = '';
    let selectFields = '';
    
    switch (period) {
      case 'daily':
        selectFields = 'DATE(created_at) as period';
        groupBy = 'DATE(created_at)';
        break;
      case 'weekly':
        selectFields = 'YEARWEEK(created_at) as period';
        groupBy = 'YEARWEEK(created_at)';
        break;
      case 'monthly':
        selectFields = 'DATE_FORMAT(created_at, "%Y-%m") as period';
        groupBy = 'YEAR(created_at), MONTH(created_at)';
        break;
      case 'yearly':
        selectFields = 'YEAR(created_at) as period';
        groupBy = 'YEAR(created_at)';
        break;
      default:
        selectFields = 'DATE_FORMAT(created_at, "%Y-%m") as period';
        groupBy = 'YEAR(created_at), MONTH(created_at)';
    }

    const databaseManager = require('../config/database');
    const connection = await databaseManager.getConnection();
    
    try {
      const [revenueData] = await connection.execute(`
        SELECT 
          ${selectFields},
          COUNT(*) as order_count,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as average_order_value,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
          SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_revenue
        FROM orders 
        ${dateCondition}
        GROUP BY ${groupBy}
        ORDER BY period DESC
      `, dateParams);

      res.json({
        message: 'Revenue analytics retrieved successfully',
        data: {
          period,
          analytics: revenueData
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Revenue analytics error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve revenue analytics'
    });
  }
});

/**
 * @swagger
 * /api/admin/analytics/products:
 *   get:
 *     summary: Get product analytics (Admin/Manager only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Product analytics retrieved successfully
 */
router.get('/analytics/products', managerOrAdmin, async (req, res) => {
  try {
    const databaseManager = require('../config/database');
    const connection = await databaseManager.getConnection();
    
    try {
      // Get top selling products
      const [topProducts] = await connection.execute(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.price,
          SUM(oi.quantity) as total_sold,
          SUM(oi.total_price) as total_revenue,
          COUNT(DISTINCT oi.order_id) as order_count
        FROM products p
        INNER JOIN order_items oi ON p.id = oi.product_id
        INNER JOIN orders o ON oi.order_id = o.id
        WHERE o.payment_status = 'paid'
        GROUP BY p.id, p.name, p.sku, p.price
        ORDER BY total_sold DESC
        LIMIT 10
      `);

      // Get products by category performance
      const [categoryPerformance] = await connection.execute(`
        SELECT 
          c.name as category_name,
          COUNT(DISTINCT p.id) as product_count,
          COALESCE(SUM(oi.quantity), 0) as total_sold,
          COALESCE(SUM(oi.total_price), 0) as total_revenue
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = 'paid'
        WHERE c.is_active = true
        GROUP BY c.id, c.name
        ORDER BY total_revenue DESC
      `);

      // Get low stock products (assuming we had stock tracking)
      const [lowStockProducts] = await connection.execute(`
        SELECT 
          p.id,
          p.name,
          p.sku,
          p.price,
          COALESCE(SUM(oi.quantity), 0) as total_sold
        FROM products p
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id AND o.payment_status = 'paid'
        GROUP BY p.id, p.name, p.sku, p.price
        ORDER BY total_sold ASC
        LIMIT 10
      `);

      res.json({
        message: 'Product analytics retrieved successfully',
        data: {
          top_selling_products: topProducts,
          category_performance: categoryPerformance,
          low_performing_products: lowStockProducts
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Product analytics error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve product analytics'
    });
  }
});

/**
 * @swagger
 * /api/admin/analytics/users:
 *   get:
 *     summary: Get user analytics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User analytics retrieved successfully
 */
router.get('/analytics/users', adminOnly, async (req, res) => {
  try {
    const databaseManager = require('../config/database');
    const connection = await databaseManager.getConnection();
    
    try {
      // Get user registration trends
      const [registrationTrends] = await connection.execute(`
        SELECT 
          DATE_FORMAT(created_at, '%Y-%m') as month,
          COUNT(*) as new_users,
          COUNT(CASE WHEN role = 'customer' THEN 1 END) as new_customers,
          COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users
        FROM users
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY YEAR(created_at), MONTH(created_at)
        ORDER BY month DESC
      `);

      // Get top customers by order value
      const [topCustomers] = await connection.execute(`
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          COUNT(o.id) as total_orders,
          SUM(o.total_amount) as total_spent,
          AVG(o.total_amount) as average_order_value,
          MAX(o.created_at) as last_order_date
        FROM users u
        INNER JOIN orders o ON u.id = o.user_id
        WHERE o.payment_status = 'paid'
        GROUP BY u.id, u.first_name, u.last_name, u.email
        ORDER BY total_spent DESC
        LIMIT 10
      `);

      // Get user activity summary
      const [activitySummary] = await connection.execute(`
        SELECT 
          COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 END) as active_today,
          COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as active_this_week,
          COUNT(CASE WHEN last_login >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as active_this_month,
          COUNT(CASE WHEN last_login IS NULL THEN 1 END) as never_logged_in
        FROM users
        WHERE role = 'customer' AND is_active = true
      `);

      res.json({
        message: 'User analytics retrieved successfully',
        data: {
          registration_trends: registrationTrends,
          top_customers: topCustomers,
          activity_summary: activitySummary[0]
        }
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('User analytics error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user analytics'
    });
  }
});

/**
 * @swagger
 * /api/admin/system/health:
 *   get:
 *     summary: Get comprehensive system health (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health retrieved successfully
 */
router.get('/system/health', adminOnly, async (req, res) => {
  try {
    const databaseManager = require('../config/database');
    
    // Get system metrics
    const memoryUsage = process.memoryUsage();
    const poolStatus = databaseManager.getPoolStatus();
    const uptime = process.uptime();

    // Test database connectivity
    let databaseHealth = { healthy: false };
    try {
      const connection = await databaseManager.getConnection();
      await connection.execute('SELECT 1');
      connection.release();
      databaseHealth = { healthy: true, ...poolStatus };
    } catch (error) {
      databaseHealth = { healthy: false, error: error.message };
    }

    // Get recent error logs (if you have error logging)
    const systemHealth = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptime,
        formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      database: databaseHealth,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'development'
      }
    };

    // Determine overall health status
    if (!databaseHealth.healthy) {
      systemHealth.status = 'unhealthy';
    } else if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.9) {
      systemHealth.status = 'warning';
    }

    res.json({
      message: 'System health retrieved successfully',
      data: systemHealth
    });
  } catch (error) {
    console.error('System health error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve system health'
    });
  }
});

module.exports = router;
