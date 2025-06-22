const mysql = require('mysql2/promise');
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

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.retryAttempts = 0;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
  }

  /**
   * Initialize database connection pool
   */
  async initialize() {
    try {
      const config = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'my_backend_db',
        waitForConnections: true,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
        queueLimit: 0,
        charset: 'utf8mb4',
        timezone: '+00:00',
        // Remove invalid options that cause warnings
        connectTimeout: parseInt(process.env.DB_TIMEOUT) || 60000,
        acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000
      };

      logger.info('Initializing database connection pool...', {
        host: config.host,
        port: config.port,
        database: config.database,
        connectionLimit: config.connectionLimit
      });

      this.pool = mysql.createPool(config);

      // Test the connection
      await this.testConnection();
      
      this.isConnected = true;
      this.retryAttempts = 0;
      
      logger.info('Database connection pool initialized successfully');
      
      // Set up connection event handlers
      this.setupEventHandlers();
      
      return this.pool;
    } catch (error) {
      logger.error('Failed to initialize database connection pool', { error: error.message });
      await this.handleConnectionError(error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      logger.info('Database connection test successful');
      return true;
    } catch (error) {
      logger.error('Database connection test failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle connection errors with retry logic
   */
  async handleConnectionError(error) {
    this.isConnected = false;
    
    if (this.retryAttempts < this.maxRetries) {
      this.retryAttempts++;
      logger.warn(`Database connection failed. Retry attempt ${this.retryAttempts}/${this.maxRetries} in ${this.retryDelay}ms`, {
        error: error.message
      });
      
      setTimeout(async () => {
        try {
          await this.initialize();
        } catch (retryError) {
          logger.error('Database retry failed', { error: retryError.message });
        }
      }, this.retryDelay);
    } else {
      logger.error('Max database connection retries exceeded', {
        maxRetries: this.maxRetries,
        error: error.message
      });
    }
  }

  /**
   * Set up event handlers for the connection pool
   */
  setupEventHandlers() {
    if (!this.pool) return;

    this.pool.on('connection', (connection) => {
      logger.debug('New database connection established', { connectionId: connection.threadId });
    });

    this.pool.on('error', (error) => {
      logger.error('Database pool error', { error: error.message });
      this.handleConnectionError(error);
    });
  }

  /**
   * Execute a query with error handling and logging
   */
  async query(sql, params = []) {
    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected. Please initialize the connection first.');
    }

    const startTime = Date.now();
    
    try {
      logger.debug('Executing database query', { sql, params });
      
      const [results] = await this.pool.execute(sql, params);
      
      const duration = Date.now() - startTime;
      logger.debug('Query executed successfully', { 
        duration: `${duration}ms`,
        rowsAffected: results.affectedRows || results.length 
      });
      
      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Database query failed', {
        sql,
        params,
        duration: `${duration}ms`,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction(callback) {
    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected. Please initialize the connection first.');
    }

    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      logger.debug('Transaction started');
      
      const result = await callback(connection);
      
      await connection.commit();
      logger.debug('Transaction committed successfully');
      
      return result;
    } catch (error) {
      await connection.rollback();
      logger.error('Transaction rolled back', { error: error.message });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get connection pool status
   */
  getPoolStatus() {
    if (!this.pool) {
      return { connected: false, pool: null };
    }

    return {
      connected: this.isConnected,
      totalConnections: this.pool.pool._allConnections.length,
      freeConnections: this.pool.pool._freeConnections.length,
      queuedRequests: this.pool.pool._connectionQueue.length
    };
  }

  /**
   * Close all connections
   */
  async close() {
    if (this.pool) {
      logger.info('Closing database connection pool...');
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      logger.info('Database connection pool closed');
    }
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

module.exports = databaseManager;
