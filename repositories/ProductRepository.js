const Product = require('../models/Product');
const databaseManager = require('../config/database');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Product Repository - handles all database operations for products
 */
class ProductRepository {
  static tableName = 'products';

  /**
   * Create a new product
   */
  static async create(productData) {
    try {
      // Validate input data
      const { error, value } = Product.validateCreate(productData);
      if (error) {
        throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
      }

      const product = new Product(value);
      const dbData = product.toDatabase();

      const sql = `
        INSERT INTO ${ProductRepository.tableName}
        (name, price, tags, description, sku, stock_quantity, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        dbData.name,
        dbData.price,
        dbData.tags,
        dbData.description,
        dbData.sku,
        dbData.stock_quantity,
        dbData.is_active
      ];

      const result = await databaseManager.query(sql, params);
      
      logger.info('Product created successfully', { 
        productId: result.insertId,
        name: product.name 
      });

      // Return the created product with ID
      return await this.findById(result.insertId);
    } catch (error) {
      logger.error('Failed to create product', { 
        error: error.message,
        productData 
      });
      throw error;
    }
  }

  /**
   * Find product by ID
   */
  static async findById(id) {
    try {
      const sql = `SELECT * FROM ${ProductRepository.tableName} WHERE id = ? AND is_active = true`;
      const results = await databaseManager.query(sql, [id]);
      
      if (results.length === 0) {
        return null;
      }

      return Product.fromDatabase(results[0]);
    } catch (error) {
      logger.error('Failed to find product by ID', { 
        error: error.message,
        productId: id 
      });
      throw error;
    }
  }

  /**
   * Find all products with pagination and filtering
   */
  static async findAll(queryParams = {}) {
    try {
      // Validate query parameters
      const { error, value } = Product.validateQuery(queryParams);
      if (error) {
        throw new Error(`Query validation error: ${error.details.map(d => d.message).join(', ')}`);
      }

      const {
        page,
        limit,
        sort_by,
        sort_order,
        search,
        min_price,
        max_price,
        is_active,
        tags
      } = value;

      // Whitelist allowed sort columns for security
      const allowedSortColumns = ['id', 'name', 'price', 'created_at', 'updated_at', 'sku'];
      const safeSortBy = allowedSortColumns.includes(sort_by) ? sort_by : 'id';

      // Whitelist allowed sort orders for security
      const safeSortOrder = ['ASC', 'DESC'].includes(sort_order?.toUpperCase()) ? sort_order.toUpperCase() : 'ASC';

      // Build WHERE clause
      const whereConditions = [];
      const params = [];

      if (is_active !== undefined) {
        whereConditions.push('is_active = ?');
        params.push(is_active);
      }

      if (search) {
        whereConditions.push('(name LIKE ? OR description LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }

      if (min_price !== undefined) {
        whereConditions.push('price >= ?');
        params.push(min_price);
      }

      if (max_price !== undefined) {
        whereConditions.push('price <= ?');
        params.push(max_price);
      }

      if (tags) {
        const tagArray = Array.isArray(tags) ? tags : [tags];
        const tagConditions = tagArray.map(() => 'JSON_CONTAINS(tags, ?)').join(' OR ');
        whereConditions.push(`(${tagConditions})`);
        tagArray.forEach(tag => params.push(`"${tag}"`));
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Count total records
      const countSql = `SELECT COUNT(*) as total FROM ${ProductRepository.tableName} ${whereClause}`;
      const countResult = await databaseManager.query(countSql, params);
      const total = countResult[0].total;

      // Calculate pagination
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit);

      // Build main query
      // const sql = `
      //   SELECT * FROM ${ProductRepository.tableName}
      //   ${whereClause}
      //   ORDER BY ${safeSortBy} ${safeSortOrder}
      //   LIMIT ? OFFSET ?
      // `;
      const sql = `
        SELECT * FROM ${ProductRepository.tableName}
         ${whereClause}
      `;

      // Ensure limit and offset are integers
      const results = await databaseManager.query(sql, [...params, parseInt(limit), parseInt(offset)]);
      
      const products = results.map(row => Product.fromDatabase(row));

      return {
        data: products,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Failed to find products', { 
        error: error.message,
        queryParams 
      });
      throw error;
    }
  }

  /**
   * Update product by ID
   */
  static async update(id, updateData) {
    try {
      // Validate input data
      const { error, value } = Product.validateUpdate(updateData);
      if (error) {
        throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
      }

      // Check if product exists
      const existingProduct = await this.findById(id);
      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // Build update query dynamically
      const updateFields = [];
      const params = [];

      Object.keys(value).forEach(key => {
        if (key === 'tags') {
          updateFields.push(`${key} = ?`);
          params.push(JSON.stringify(value[key]));
        } else {
          updateFields.push(`${key} = ?`);
          params.push(value[key]);
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      params.push(id);

      const sql = `
        UPDATE ${ProductRepository.tableName}
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND is_active = true
      `;

      const result = await databaseManager.query(sql, params);

      if (result.affectedRows === 0) {
        throw new Error('Product not found or no changes made');
      }

      logger.info('Product updated successfully', { 
        productId: id,
        updatedFields: Object.keys(value)
      });

      // Return updated product
      return await this.findById(id);
    } catch (error) {
      logger.error('Failed to update product', { 
        error: error.message,
        productId: id,
        updateData 
      });
      throw error;
    }
  }

  /**
   * Soft delete product by ID
   */
  static async delete(id) {
    try {
      const sql = `
        UPDATE ${ProductRepository.tableName}
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND is_active = true
      `;

      const result = await databaseManager.query(sql, [id]);

      if (result.affectedRows === 0) {
        throw new Error('Product not found');
      }

      logger.info('Product deleted successfully', { productId: id });

      return { success: true, message: 'Product deleted successfully' };
    } catch (error) {
      logger.error('Failed to delete product', { 
        error: error.message,
        productId: id 
      });
      throw error;
    }
  }

  /**
   * Hard delete product by ID (use with caution)
   */
  static async hardDelete(id) {
    try {
      const sql = `DELETE FROM ${ProductRepository.tableName} WHERE id = ?`;
      const result = await databaseManager.query(sql, [id]);

      if (result.affectedRows === 0) {
        throw new Error('Product not found');
      }

      logger.warn('Product hard deleted', { productId: id });

      return { success: true, message: 'Product permanently deleted' };
    } catch (error) {
      logger.error('Failed to hard delete product', { 
        error: error.message,
        productId: id 
      });
      throw error;
    }
  }

  /**
   * Check if SKU exists
   */
  static async skuExists(sku, excludeId = null) {
    try {
      let sql = `SELECT id FROM ${ProductRepository.tableName} WHERE sku = ? AND is_active = true`;
      const params = [sku];

      if (excludeId) {
        sql += ' AND id != ?';
        params.push(excludeId);
      }

      const results = await databaseManager.query(sql, params);
      return results.length > 0;
    } catch (error) {
      logger.error('Failed to check SKU existence', { 
        error: error.message,
        sku 
      });
      throw error;
    }
  }

  /**
   * Get product statistics
   */
  static async getStatistics() {
    try {
      const sql = `
        SELECT
          COUNT(*) as total_products,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_products,
          COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_products,
          AVG(price) as average_price,
          MIN(price) as min_price,
          MAX(price) as max_price,
          COUNT(CASE WHEN stock_quantity = 0 THEN 1 END) as out_of_stock,
          COUNT(CASE WHEN stock_quantity > 0 AND stock_quantity <= 10 THEN 1 END) as low_stock,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as products_added_today,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as products_added_this_week,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as products_added_this_month
        FROM ${ProductRepository.tableName}
      `;

      const results = await databaseManager.query(sql, []);
      return results[0];
    } catch (error) {
      console.error('Error getting product statistics:', error);
      throw error;
    }
  }
}

module.exports = ProductRepository;
