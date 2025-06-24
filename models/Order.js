const joi = require('joi');

/**
 * Order model for e-commerce functionality
 */
class Order {
  constructor(data = {}) {
    this.id = data.id || null;
    this.user_id = data.user_id || null;
    this.order_number = data.order_number || '';
    this.status = data.status || 'pending';
    this.total_amount = data.total_amount || 0;
    this.subtotal = data.subtotal || 0;
    this.tax_amount = data.tax_amount || 0;
    this.shipping_amount = data.shipping_amount || 0;
    this.discount_amount = data.discount_amount || 0;
    this.currency = data.currency || 'NGN';
    this.payment_status = data.payment_status || 'pending';
    this.payment_method = data.payment_method || '';
    this.shipping_address = data.shipping_address || {};
    this.billing_address = data.billing_address || {};
    this.notes = data.notes || '';
    this.shipped_at = data.shipped_at || null;
    this.delivered_at = data.delivered_at || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
  }

  /**
   * Order status constants
   */
  static get STATUS() {
    return {
      PENDING: 'pending',
      CONFIRMED: 'confirmed',
      PROCESSING: 'processing',
      SHIPPED: 'shipped',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
      REFUNDED: 'refunded'
    };
  }

  /**
   * Payment status constants
   */
  static get PAYMENT_STATUS() {
    return {
      PENDING: 'pending',
      PAID: 'paid',
      FAILED: 'failed',
      REFUNDED: 'refunded',
      PARTIALLY_REFUNDED: 'partially_refunded'
    };
  }

  /**
   * Validation schema for creating an order
   */
  static get createSchema() {
    return joi.object({
      user_id: joi.number().integer().positive().required()
        .messages({
          'any.required': 'User ID is required'
        }),
      
      items: joi.array().items(
        joi.object({
          product_id: joi.number().integer().positive().required(),
          quantity: joi.number().integer().min(1).required(),
          price: joi.number().min(0).precision(2).required()
        })
      ).min(1).required()
        .messages({
          'array.min': 'At least one item is required',
          'any.required': 'Order items are required'
        }),
      
      shipping_address: joi.object({
        first_name: joi.string().max(100).required(),
        last_name: joi.string().max(100).required(),
        address_line_1: joi.string().max(255).required(),
        address_line_2: joi.string().max(255).allow(''),
        city: joi.string().max(100).required(),
        state: joi.string().max(100).required(),
        postal_code: joi.string().max(20).required(),
        country: joi.string().max(100).default('Nigeria'),
        phone: joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).allow('')
      }).required(),
      
      billing_address: joi.object({
        first_name: joi.string().max(100).required(),
        last_name: joi.string().max(100).required(),
        address_line_1: joi.string().max(255).required(),
        address_line_2: joi.string().max(255).allow(''),
        city: joi.string().max(100).required(),
        state: joi.string().max(100).required(),
        postal_code: joi.string().max(20).required(),
        country: joi.string().max(100).default('Nigeria'),
        phone: joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).allow('')
      }).allow(null),
      
      payment_method: joi.string().valid('card', 'bank_transfer', 'cash_on_delivery', 'wallet').required(),
      
      notes: joi.string().max(1000).allow('').default(''),
      
      discount_amount: joi.number().min(0).precision(2).default(0),
      
      shipping_amount: joi.number().min(0).precision(2).default(0)
    });
  }

  /**
   * Validation schema for updating order status
   */
  static get updateStatusSchema() {
    return joi.object({
      status: joi.string().valid(...Object.values(Order.STATUS)).required(),
      notes: joi.string().max(1000).allow('')
    });
  }

  /**
   * Validation schema for updating payment status
   */
  static get updatePaymentSchema() {
    return joi.object({
      payment_status: joi.string().valid(...Object.values(Order.PAYMENT_STATUS)).required(),
      payment_reference: joi.string().max(255).allow(''),
      notes: joi.string().max(1000).allow('')
    });
  }

  /**
   * Validation schema for query parameters
   */
  static get querySchema() {
    return joi.object({
      page: joi.number().integer().min(1).default(1),
      limit: joi.number().integer().min(1).max(100).default(10),
      sort_by: joi.string().valid('id', 'order_number', 'total_amount', 'created_at').default('created_at'),
      sort_order: joi.string().valid('ASC', 'DESC').default('DESC'),
      status: joi.string().valid(...Object.values(Order.STATUS)),
      payment_status: joi.string().valid(...Object.values(Order.PAYMENT_STATUS)),
      user_id: joi.number().integer().positive(),
      date_from: joi.date().iso(),
      date_to: joi.date().iso(),
      min_amount: joi.number().min(0),
      max_amount: joi.number().min(0)
    });
  }

  /**
   * Generate unique order number
   */
  generateOrderNumber() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.order_number = `ORD-${timestamp}-${random}`;
  }

  /**
   * Calculate total amount
   */
  calculateTotal() {
    this.total_amount = this.subtotal + this.tax_amount + this.shipping_amount - this.discount_amount;
    return this.total_amount;
  }

  /**
   * Check if order can be cancelled
   */
  canBeCancelled() {
    return [Order.STATUS.PENDING, Order.STATUS.CONFIRMED].includes(this.status);
  }

  /**
   * Check if order can be shipped
   */
  canBeShipped() {
    return [Order.STATUS.CONFIRMED, Order.STATUS.PROCESSING].includes(this.status) && 
           this.payment_status === Order.PAYMENT_STATUS.PAID;
  }

  /**
   * Check if order is completed
   */
  isCompleted() {
    return this.status === Order.STATUS.DELIVERED;
  }

  /**
   * Validate order data for creation
   */
  static validateCreate(data) {
    return this.createSchema.validate(data, { abortEarly: false });
  }

  /**
   * Validate status update data
   */
  static validateStatusUpdate(data) {
    return this.updateStatusSchema.validate(data, { abortEarly: false });
  }

  /**
   * Validate payment update data
   */
  static validatePaymentUpdate(data) {
    return this.updatePaymentSchema.validate(data, { abortEarly: false });
  }

  /**
   * Validate query parameters
   */
  static validateQuery(data) {
    return this.querySchema.validate(data, { abortEarly: false });
  }

  /**
   * Convert database row to Order instance
   */
  static fromDatabase(row) {
    if (!row) return null;
    
    return new Order({
      ...row,
      shipping_address: typeof row.shipping_address === 'string' ? 
        JSON.parse(row.shipping_address || '{}') : row.shipping_address || {},
      billing_address: typeof row.billing_address === 'string' ? 
        JSON.parse(row.billing_address || '{}') : row.billing_address || {}
    });
  }

  /**
   * Convert Order instance to database format
   */
  toDatabase() {
    return {
      user_id: this.user_id,
      order_number: this.order_number,
      status: this.status,
      total_amount: this.total_amount,
      subtotal: this.subtotal,
      tax_amount: this.tax_amount,
      shipping_amount: this.shipping_amount,
      discount_amount: this.discount_amount,
      currency: this.currency,
      payment_status: this.payment_status,
      payment_method: this.payment_method,
      shipping_address: JSON.stringify(this.shipping_address),
      billing_address: JSON.stringify(this.billing_address),
      notes: this.notes,
      shipped_at: this.shipped_at,
      delivered_at: this.delivered_at
    };
  }

  /**
   * Convert Order instance to API response format
   */
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      order_number: this.order_number,
      status: this.status,
      total_amount: this.total_amount,
      subtotal: this.subtotal,
      tax_amount: this.tax_amount,
      shipping_amount: this.shipping_amount,
      discount_amount: this.discount_amount,
      currency: this.currency,
      payment_status: this.payment_status,
      payment_method: this.payment_method,
      shipping_address: this.shipping_address,
      billing_address: this.billing_address,
      notes: this.notes,
      shipped_at: this.shipped_at,
      delivered_at: this.delivered_at,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Order;
