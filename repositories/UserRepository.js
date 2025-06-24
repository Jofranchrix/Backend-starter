const databaseManager = require('../config/database');
const User = require('../models/User');

/**
 * User Repository - Handles all user-related database operations
 */
class UserRepository {
  /**
   * Create a new user
   */
  static async create(userData) {
    const { error, value } = User.validateRegister(userData);
    if (error) {
      throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
    }

    const user = new User(value);
    
    // Check if email already exists
    const existingUser = await this.findByEmail(user.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // Hash password
    await user.hashPassword();

    const connection = await databaseManager.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO users (email, password, first_name, last_name, phone, role, is_active, email_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.email,
          user.password,
          user.first_name,
          user.last_name,
          user.phone,
          user.role,
          user.is_active,
          user.email_verified
        ]
      );

      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const connection = await databaseManager.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      return rows.length > 0 ? User.fromDatabase(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const connection = await databaseManager.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      return rows.length > 0 ? User.fromDatabase(rows[0]) : null;
    } finally {
      connection.release();
    }
  }

  /**
   * Find all users with pagination and filtering
   */
  static async findAll(queryParams = {}) {
    const {
      page = 1,
      limit = 10,
      sort_by = 'created_at',
      sort_order = 'DESC',
      search = '',
      role = '',
      is_active = ''
    } = queryParams;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryValues = [];

    // Build WHERE conditions
    if (search) {
      whereConditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
      const searchTerm = `%${search}%`;
      queryValues.push(searchTerm, searchTerm, searchTerm);
    }

    if (role) {
      whereConditions.push('role = ?');
      queryValues.push(role);
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
        `SELECT COUNT(*) as total FROM users ${whereClause}`,
        queryValues
      );
      const total = countResult[0].total;

      // Get users
      const [rows] = await connection.execute(
        `SELECT * FROM users ${whereClause}
         ORDER BY ${sort_by} ${sort_order}
         LIMIT ? OFFSET ?`,
        [...queryValues, parseInt(limit), parseInt(offset)]
      );

      const users = rows.map(row => User.fromDatabase(row));

      return {
        data: users,
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
   * Update user
   */
  static async update(id, updateData) {
    const { error, value } = User.validateUpdate(updateData);
    if (error) {
      throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
    }

    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const updateFields = [];
    const updateValues = [];

    Object.keys(value).forEach(key => {
      updateFields.push(`${key} = ?`);
      updateValues.push(value[key]);
    });

    if (updateFields.length === 0) {
      return user;
    }

    updateValues.push(id);

    const connection = await databaseManager.getConnection();
    try {
      await connection.execute(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(id, passwordData) {
    const { error, value } = User.validatePasswordChange(passwordData);
    if (error) {
      throw new Error(`Validation error: ${error.details.map(d => d.message).join(', ')}`);
    }

    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.verifyPassword(value.current_password);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const tempUser = new User({ password: value.new_password });
    await tempUser.hashPassword();

    const connection = await databaseManager.getConnection();
    try {
      await connection.execute(
        'UPDATE users SET password = ? WHERE id = ?',
        [tempUser.password, id]
      );

      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  /**
   * Update last login timestamp
   */
  static async updateLastLogin(id) {
    const connection = await databaseManager.getConnection();
    try {
      await connection.execute(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
    } finally {
      connection.release();
    }
  }

  /**
   * Soft delete user (deactivate)
   */
  static async softDelete(id) {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const connection = await databaseManager.getConnection();
    try {
      await connection.execute(
        'UPDATE users SET is_active = FALSE WHERE id = ?',
        [id]
      );

      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  /**
   * Hard delete user (permanent)
   */
  static async delete(id) {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    const connection = await databaseManager.getConnection();
    try {
      const [result] = await connection.execute(
        'DELETE FROM users WHERE id = ?',
        [id]
      );

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Get user statistics
   */
  static async getStatistics() {
    const connection = await databaseManager.getConnection();
    try {
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
          COUNT(CASE WHEN role = 'manager' THEN 1 END) as manager_users,
          COUNT(CASE WHEN role = 'customer' THEN 1 END) as customer_users,
          COUNT(CASE WHEN email_verified = TRUE THEN 1 END) as verified_users,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as users_today,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as users_this_week,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as users_this_month
        FROM users
      `);

      return stats[0];
    } finally {
      connection.release();
    }
  }

  /**
   * Authenticate user (login)
   */
  static async authenticate(email, password) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await this.updateLastLogin(user.id);

    return user;
  }

  /**
   * Search users by various criteria
   */
  static async search(searchTerm, filters = {}) {
    const connection = await databaseManager.getConnection();
    try {
      let whereConditions = [];
      let queryValues = [];

      // Search in multiple fields
      if (searchTerm) {
        whereConditions.push(`(
          first_name LIKE ? OR
          last_name LIKE ? OR
          email LIKE ? OR
          CONCAT(first_name, ' ', last_name) LIKE ?
        )`);
        const term = `%${searchTerm}%`;
        queryValues.push(term, term, term, term);
      }

      // Apply filters
      if (filters.role) {
        whereConditions.push('role = ?');
        queryValues.push(filters.role);
      }

      if (filters.is_active !== undefined) {
        whereConditions.push('is_active = ?');
        queryValues.push(filters.is_active);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const [rows] = await connection.execute(
        `SELECT * FROM users ${whereClause} ORDER BY first_name, last_name LIMIT 50`,
        queryValues
      );

      return rows.map(row => User.fromDatabase(row));
    } finally {
      connection.release();
    }
  }
}

module.exports = UserRepository;
