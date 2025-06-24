const databaseManager = require('../config/database');
const Category = require('../models/Category');

/**
 * Category Repository - Handles all category-related database operations
 */
class CategoryRepository {
  /**
   * Create a new category
   */
  static async create(categoryData) {
    const { error, value } = Category.validateCreate(categoryData);
    if (error) {
      throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
    }

    const category = new Category(value);
    
    // Generate slug if not provided
    category.generateSlug();

    // Check if slug already exists
    const existingCategory = await this.findBySlug(category.slug);
    if (existingCategory) {
      throw new Error('Category slug already exists');
    }

    // Validate parent category if provided
    if (category.parent_id) {
      const parentCategory = await this.findById(category.parent_id);
      if (!parentCategory) {
        throw new Error('Parent category not found');
      }
    }

    const connection = await databaseManager.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO categories (name, description, slug, parent_id, is_active, sort_order, image_url, meta_title, meta_description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          category.name,
          category.description,
          category.slug,
          category.parent_id,
          category.is_active,
          category.sort_order,
          category.image_url,
          category.meta_title,
          category.meta_description
        ]
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * Find category by ID
   */
  static async findById(id) {
    const connection = await databaseManager.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM categories WHERE id = ?',
        [id]
      );

      return rows.length > 0 ? Category.fromDatabase(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * Find category by slug
   */
  static async findBySlug(slug) {
    const connection = await databaseManager.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM categories WHERE slug = ?',
        [slug]
      );

      return rows.length > 0 ? Category.fromDatabase(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * Find all categories with pagination and filtering
   */
  static async findAll(queryParams = {}) {
    const {
      page = 1,
      limit = 10,
      sort_by = 'sort_order',
      sort_order = 'ASC',
      search = '',
      parent_id = '',
      is_active = '',
      include_children = false
    } = queryParams;

    // Whitelist allowed sort columns for security
    const allowedSortColumns = ['id', 'name', 'sort_order', 'created_at', 'updated_at'];
    const safeSortBy = allowedSortColumns.includes(sort_by) ? sort_by : 'sort_order';

    // Whitelist allowed sort orders for security
    const safeSortOrder = ['ASC', 'DESC'].includes(sort_order?.toUpperCase()) ? sort_order.toUpperCase() : 'ASC';

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryValues = [];

    // Build WHERE conditions
    if (search) {
      whereConditions.push('(name LIKE ? OR description LIKE ?)');
      const searchTerm = `%${search}%`;
      queryValues.push(searchTerm, searchTerm);
    }

    if (parent_id !== '') {
      if (parent_id === 'null' || parent_id === null) {
        whereConditions.push('parent_id IS NULL');
      } else {
        whereConditions.push('parent_id = ?');
        queryValues.push(parent_id);
      }
    }

    if (is_active !== '') {
      whereConditions.push('is_active = ?');
      queryValues.push(is_active === 'true');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const connection = await databaseManager.getConnection();
    try {
      // Get total count
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM categories ${whereClause}`,
        queryValues
      );
      const total = countResult[0].total;

      // Get categories
      const [rows] = await connection.execute(
        `SELECT * FROM categories ${whereClause}
         ORDER BY ${safeSortBy} ${safeSortOrder}
         LIMIT ? OFFSET ?`,
        [...queryValues, parseInt(limit), parseInt(offset)]
      );

      let categories = rows.map(row => Category.fromDatabase(row));

      // Include children if requested
      if (include_children) {
        categories = await this.attachChildren(categories);
      }

      return {
        data: categories,
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
   * Get category tree structure
   */
  static async getTree() {
    const connection = await databaseManager.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM categories WHERE is_active = TRUE ORDER BY sort_order ASC'
      );

      const categories = rows.map(row => Category.fromDatabase(row));
      return this.buildTree(categories);
    } finally {
      connection.release();
    }
  }

  /**
   * Build hierarchical tree structure
   */
  static buildTree(categories, parentId = null) {
    const tree = [];
    
    categories.forEach(category => {
      if (category.parent_id === parentId) {
        const children = this.buildTree(categories, category.id);
        tree.push(category.toTreeNode(children));
      }
    });

    return tree;
  }

  /**
   * Attach children to categories
   */
  static async attachChildren(categories) {
    const connection = await databaseManager.getConnection();
    try {
      for (let category of categories) {
        const [childRows] = await connection.execute(
          'SELECT * FROM categories WHERE parent_id = ? AND is_active = TRUE ORDER BY sort_order ASC',
          [category.id]
        );
        
        category.children = childRows.map(row => Category.fromDatabase(row));
      }

      return categories;
    } finally {
      connection.release();
    }
  }

  /**
   * Update category
   */
  static async update(id, updateData) {
    const { error, value } = Category.validateUpdate(updateData);
    if (error) {
      throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
    }

    const category = await this.findById(id);
    if (!category) {
      throw new Error('Category not found');
    }

    // Generate slug if name is being updated
    if (value.name && !value.slug) {
      const tempCategory = new Category({ name: value.name });
      tempCategory.generateSlug();
      value.slug = tempCategory.slug;
    }

    // Check if slug already exists (excluding current category)
    if (value.slug) {
      const existingCategory = await this.findBySlug(value.slug);
      if (existingCategory && existingCategory.id !== id) {
        throw new Error('Category slug already exists');
      }
    }

    // Validate parent category if provided
    if (value.parent_id) {
      if (value.parent_id === id) {
        throw new Error('Category cannot be its own parent');
      }
      
      const parentCategory = await this.findById(value.parent_id);
      if (!parentCategory) {
        throw new Error('Parent category not found');
      }
    }

    const updateFields = [];
    const updateValues = [];

    Object.keys(value).forEach(key => {
      updateFields.push(`${key} = ?`);
      updateValues.push(value[key]);
    });

    if (updateFields.length === 0) {
      return category;
    }

    updateValues.push(id);

    const connection = await databaseManager.getConnection();
    try {
      await connection.execute(
        `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  /**
   * Delete category
   */
  static async delete(id) {
    const category = await this.findById(id);
    if (!category) {
      throw new Error('Category not found');
    }

    // Check if category has children
    const connection = await databaseManager.getConnection();
    try {
      const [childRows] = await connection.execute(
        'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
        [id]
      );

      if (childRows[0].count > 0) {
        throw new Error('Cannot delete category with subcategories');
      }

      // Check if category has products
      const [productRows] = await connection.execute(
        'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
        [id]
      );

      if (productRows[0].count > 0) {
        throw new Error('Cannot delete category with products');
      }

      const [result] = await connection.execute(
        'DELETE FROM categories WHERE id = ?',
        [id]
      );

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Get category statistics
   */
  static async getStatistics() {
    const connection = await databaseManager.getConnection();
    try {
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_categories,
          COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_categories,
          COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as root_categories,
          COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as subcategories
        FROM categories
      `);

      return stats[0];
    } finally {
      connection.release();
    }
  }
}

module.exports = CategoryRepository;
