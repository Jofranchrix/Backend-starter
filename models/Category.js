const joi = require('joi');

/**
 * Category model for product categorization
 */
class Category {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.description = data.description || '';
    this.slug = data.slug || '';
    this.parent_id = data.parent_id || null;
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.sort_order = data.sort_order || 0;
    this.image_url = data.image_url || '';
    this.meta_title = data.meta_title || '';
    this.meta_description = data.meta_description || '';
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  /**
   * Validation schema for creating a category
   */
  static get createSchema() {
    return joi.object({
      name: joi.string().min(1).max(255).required()
        .messages({
          'string.empty': 'Category name is required',
          'string.max': 'Category name must not exceed 255 characters'
        }),
      
      description: joi.string().max(1000).allow('').default(''),
      
      slug: joi.string().max(255).pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).allow('')
        .messages({
          'string.pattern.base': 'Slug must contain only lowercase letters, numbers, and hyphens'
        }),
      
      parent_id: joi.number().integer().positive().allow(null).default(null),
      
      is_active: joi.boolean().default(true),
      
      sort_order: joi.number().integer().min(0).default(0),
      
      image_url: joi.string().uri().allow('').default(''),
      
      meta_title: joi.string().max(255).allow('').default(''),
      
      meta_description: joi.string().max(500).allow('').default('')
    });
  }

  /**
   * Validation schema for updating a category
   */
  static get updateSchema() {
    return joi.object({
      name: joi.string().min(1).max(255)
        .messages({
          'string.empty': 'Category name cannot be empty',
          'string.max': 'Category name must not exceed 255 characters'
        }),
      
      description: joi.string().max(1000).allow(''),
      
      slug: joi.string().max(255).pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).allow('')
        .messages({
          'string.pattern.base': 'Slug must contain only lowercase letters, numbers, and hyphens'
        }),
      
      parent_id: joi.number().integer().positive().allow(null),
      
      is_active: joi.boolean(),
      
      sort_order: joi.number().integer().min(0),
      
      image_url: joi.string().uri().allow(''),
      
      meta_title: joi.string().max(255).allow(''),
      
      meta_description: joi.string().max(500).allow('')
    }).min(1);
  }

  /**
   * Validation schema for query parameters
   */
  static get querySchema() {
    return joi.object({
      page: joi.number().integer().min(1).default(1),
      limit: joi.number().integer().min(1).max(100).default(10),
      sort_by: joi.string().valid('id', 'name', 'sort_order', 'created_at').default('sort_order'),
      sort_order: joi.string().valid('ASC', 'DESC').default('ASC'),
      search: joi.string().max(255).allow(''),
      parent_id: joi.number().integer().positive().allow(null),
      is_active: joi.boolean(),
      include_children: joi.boolean().default(false)
    });
  }

  /**
   * Generate slug from name
   */
  generateSlug() {
    if (!this.slug && this.name) {
      this.slug = this.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim('-'); // Remove leading/trailing hyphens
    }
  }

  /**
   * Validate category data for creation
   */
  static validateCreate(data) {
    return this.createSchema.validate(data, { abortEarly: false });
  }

  /**
   * Validate category data for update
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
   * Convert database row to Category instance
   */
  static fromDatabase(row) {
    if (!row) return null;
    return new Category(row);
  }

  /**
   * Convert Category instance to database format
   */
  toDatabase() {
    return {
      name: this.name,
      description: this.description,
      slug: this.slug,
      parent_id: this.parent_id,
      is_active: this.is_active,
      sort_order: this.sort_order,
      image_url: this.image_url,
      meta_title: this.meta_title,
      meta_description: this.meta_description
    };
  }

  /**
   * Convert Category instance to API response format
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      slug: this.slug,
      parent_id: this.parent_id,
      is_active: this.is_active,
      sort_order: this.sort_order,
      image_url: this.image_url,
      meta_title: this.meta_title,
      meta_description: this.meta_description,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  /**
   * Convert to tree structure format
   */
  toTreeNode(children = []) {
    return {
      ...this.toJSON(),
      children: children.map(child => child.toJSON ? child.toJSON() : child)
    };
  }

  /**
   * Check if this category is a parent of another category
   */
  isParentOf(categoryId) {
    return this.id === categoryId;
  }

  /**
   * Check if this category is a child of another category
   */
  isChildOf(categoryId) {
    return this.parent_id === categoryId;
  }

  /**
   * Get breadcrumb path (requires parent categories)
   */
  getBreadcrumb(parentCategories = []) {
    const breadcrumb = [];
    let current = this;
    
    while (current) {
      breadcrumb.unshift({
        id: current.id,
        name: current.name,
        slug: current.slug
      });
      
      current = parentCategories.find(cat => cat.id === current.parent_id);
    }
    
    return breadcrumb;
  }
}

module.exports = Category;
