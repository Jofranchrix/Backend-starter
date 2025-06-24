const joi = require('joi');
const bcrypt = require('bcrypt');

/**
 * User model with authentication and authorization
 */
class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.email = data.email || '';
    this.password = data.password || '';
    this.first_name = data.first_name || '';
    this.last_name = data.last_name || '';
    this.phone = data.phone || '';
    this.role = data.role || 'customer';
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.email_verified = data.email_verified !== undefined ? data.email_verified : false;
    this.last_login = data.last_login || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  /**
   * Validation schema for user registration
   */
  static get registerSchema() {
    return joi.object({
      email: joi.string().email().max(255).required()
        .messages({
          'string.email': 'Please provide a valid email address',
          'any.required': 'Email is required'
        }),
      
      password: joi.string().min(8).max(128).required()
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
        .messages({
          'string.min': 'Password must be at least 8 characters long',
          'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
          'any.required': 'Password is required'
        }),
      
      first_name: joi.string().min(1).max(100).required()
        .messages({
          'string.empty': 'First name is required',
          'string.max': 'First name must not exceed 100 characters'
        }),
      
      last_name: joi.string().min(1).max(100).required()
        .messages({
          'string.empty': 'Last name is required',
          'string.max': 'Last name must not exceed 100 characters'
        }),
      
      phone: joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).allow('')
        .messages({
          'string.pattern.base': 'Please provide a valid phone number'
        }),
      
      role: joi.string().valid('customer', 'admin', 'manager').default('customer')
    });
  }

  /**
   * Validation schema for user login
   */
  static get loginSchema() {
    return joi.object({
      email: joi.string().email().required()
        .messages({
          'string.email': 'Please provide a valid email address',
          'any.required': 'Email is required'
        }),
      
      password: joi.string().required()
        .messages({
          'any.required': 'Password is required'
        })
    });
  }

  /**
   * Validation schema for updating user profile
   */
  static get updateSchema() {
    return joi.object({
      first_name: joi.string().min(1).max(100)
        .messages({
          'string.empty': 'First name cannot be empty',
          'string.max': 'First name must not exceed 100 characters'
        }),
      
      last_name: joi.string().min(1).max(100)
        .messages({
          'string.empty': 'Last name cannot be empty',
          'string.max': 'Last name must not exceed 100 characters'
        }),
      
      phone: joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).allow('')
        .messages({
          'string.pattern.base': 'Please provide a valid phone number'
        }),
      
      is_active: joi.boolean()
    }).min(1);
  }

  /**
   * Validation schema for password change
   */
  static get passwordChangeSchema() {
    return joi.object({
      current_password: joi.string().required()
        .messages({
          'any.required': 'Current password is required'
        }),
      
      new_password: joi.string().min(8).max(128).required()
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&\*])'))
        .messages({
          'string.min': 'New password must be at least 8 characters long',
          'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
          'any.required': 'New password is required'
        }),
      
      confirm_password: joi.string().valid(joi.ref('new_password')).required()
        .messages({
          'any.only': 'Password confirmation does not match new password',
          'any.required': 'Password confirmation is required'
        })
    });
  }

  /**
   * Hash password before saving
   */
  async hashPassword() {
    if (this.password) {
      const saltRounds = 12;
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
  }

  /**
   * Validate user data for registration
   */
  static validateRegister(data) {
    return this.registerSchema.validate(data, { abortEarly: false });
  }

  /**
   * Validate user data for login
   */
  static validateLogin(data) {
    return this.loginSchema.validate(data, { abortEarly: false });
  }

  /**
   * Validate user data for update
   */
  static validateUpdate(data) {
    return this.updateSchema.validate(data, { abortEarly: false });
  }

  /**
   * Validate password change data
   */
  static validatePasswordChange(data) {
    return this.passwordChangeSchema.validate(data, { abortEarly: false });
  }

  /**
   * Convert database row to User instance
   */
  static fromDatabase(row) {
    if (!row) return null;
    return new User(row);
  }

  /**
   * Convert User instance to database format
   */
  toDatabase() {
    return {
      email: this.email,
      password: this.password,
      first_name: this.first_name,
      last_name: this.last_name,
      phone: this.phone,
      role: this.role,
      is_active: this.is_active,
      email_verified: this.email_verified,
      last_login: this.last_login
    };
  }

  /**
   * Convert User instance to API response format (excluding sensitive data)
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      first_name: this.first_name,
      last_name: this.last_name,
      phone: this.phone,
      role: this.role,
      is_active: this.is_active,
      email_verified: this.email_verified,
      last_login: this.last_login,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Get full name
   */
  get fullName() {
    return `${this.first_name} ${this.last_name}`.trim();
  }

  /**
   * Check if user has specific role
   */
  hasRole(role) {
    return this.role === role;
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.role === 'admin';
  }

  /**
   * Check if user is manager or admin
   */
  isManagerOrAdmin() {
    return ['admin', 'manager'].includes(this.role);
  }
}

module.exports = User;
