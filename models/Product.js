const joi = require('joi');

/**
 * Product model with validation schemas
 */
class Product {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.price = data.price || 0;
    this.tags = data.tags || [];
    this.description = data.description || '';
    this.sku = data.sku || '';
    this.stock_quantity = data.stock_quantity || 0;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  /**
   * Validation schema for creating a product
   */
  static get createSchema() {
    return joi.object({
      name: joi.string().min(1).max(255).required()
        .messages({
          'string.empty': 'Product name is required',
          'string.max': 'Product name must not exceed 255 characters'
        }),
      
      price: joi.number().min(0).precision(2).required()
        .messages({
          'number.min': 'Price must be a positive number',
          'any.required': 'Price is required'
        }),
      
      tags: joi.array().items(joi.string().max(50)).max(10).default([])
        .messages({
          'array.max': 'Maximum 10 tags allowed',
          'string.max': 'Each tag must not exceed 50 characters'
        }),
      
      description: joi.string().max(1000).allow('').default(''),
      
      sku: joi.string().max(100).allow('').default(''),
      
      stock_quantity: joi.number().integer().min(0).default(0)
        .messages({
          'number.min': 'Stock quantity cannot be negative'
        }),
      
      is_active: joi.boolean().default(true)
    });
  }

  /**
   * Validation schema for updating a product
   */
  static get updateSchema() {
    return joi.object({
      name: joi.string().min(1).max(255)
        .messages({
          'string.empty': 'Product name cannot be empty',
          'string.max': 'Product name must not exceed 255 characters'
        }),
      
      price: joi.number().min(0).precision(2)
        .messages({
          'number.min': 'Price must be a positive number'
        }),
      
      tags: joi.array().items(joi.string().max(50)).max(10)
        .messages({
          'array.max': 'Maximum 10 tags allowed',
          'string.max': 'Each tag must not exceed 50 characters'
        }),
      
      description: joi.string().max(1000).allow(''),
      
      sku: joi.string().max(100).allow(''),
      
      stock_quantity: joi.number().integer().min(0)
        .messages({
          'number.min': 'Stock quantity cannot be negative'
        }),
      
      is_active: joi.boolean()
    }).min(1); // At least one field must be provided for update
  }

  /**
   * Validation schema for query parameters
   */
  static get querySchema() {
    return joi.object({
      page: joi.number().integer().min(1).default(1),
      limit: joi.number().integer().min(1).max(100).default(10),
      sort_by: joi.string().valid('id', 'name', 'price', 'created_at').default('id'),
      sort_order: joi.string().valid('ASC', 'DESC').default('ASC'),
      search: joi.string().max(255).allow(''),
      min_price: joi.number().min(0),
      max_price: joi.number().min(0),
      is_active: joi.boolean(),
      tags: joi.alternatives().try(
        joi.string(),
        joi.array().items(joi.string())
      )
    });
  }

  /**
   * Validate product data for creation
   */
  static validateCreate(data) {
    return this.createSchema.validate(data, { abortEarly: false });
  }

  /**
   * Validate product data for update
   */
  static validateUpdate(data) {
    return this.updateSchema.validate(data, { abortEarly: false });
  }

  /**
   * Validate query parameters
   */
  static validateQuery(data) {
    return this.querySchema.validate(data, { abortEarly: false });
  }

  /**
   * Convert database row to Product instance
   */
  static fromDatabase(row) {
    if (!row) return null;
    
    return new Product({
      ...row,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags || '[]') : row.tags || []
    });
  }

  /**
   * Convert Product instance to database format
   */
  toDatabase() {
    return {
      name: this.name,
      price: this.price,
      tags: JSON.stringify(this.tags),
      description: this.description,
      sku: this.sku,
      stock_quantity: this.stock_quantity,
      is_active: this.is_active
    };
  }

  /**
   * Convert Product instance to API response format
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      price: this.price,
      tags: this.tags,
      description: this.description,
      sku: this.sku,
      stock_quantity: this.stock_quantity,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Product;
