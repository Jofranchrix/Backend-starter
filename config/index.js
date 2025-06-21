require('dotenv').config();
const joi = require('joi');

// Define validation schema for environment variables
const envSchema = joi.object({
  NODE_ENV: joi.string().valid('development', 'staging', 'production').default('development'),
  PORT: joi.number().port().default(3000),
  APP_NAME: joi.string().default('my-backend-project'),
  
  // Database configuration
  DB_HOST: joi.string().required(),
  DB_PORT: joi.number().port().default(3306),
  DB_NAME: joi.string().required(),
  DB_USER: joi.string().required(),
  DB_PASSWORD: joi.string().allow('').default(''),
  DB_CONNECTION_LIMIT: joi.number().min(1).max(100).default(10),
  DB_ACQUIRE_TIMEOUT: joi.number().min(1000).default(60000),
  DB_TIMEOUT: joi.number().min(1000).default(60000),
  
  // Security configuration
  JWT_SECRET: joi.string().min(32).required(),
  BCRYPT_ROUNDS: joi.number().min(8).max(15).default(12),
  
  // Logging configuration
  LOG_LEVEL: joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FILE: joi.string().default('logs/app.log'),
  
  // CORS configuration
  CORS_ORIGIN: joi.string().default('*'),
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: joi.number().min(1000).default(900000),
  RATE_LIMIT_MAX_REQUESTS: joi.number().min(1).default(100)
}).unknown();

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  appName: envVars.APP_NAME,
  
  database: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    name: envVars.DB_NAME,
    user: envVars.DB_USER,
    password: envVars.DB_PASSWORD,
    connectionLimit: envVars.DB_CONNECTION_LIMIT,
    acquireTimeout: envVars.DB_ACQUIRE_TIMEOUT,
    timeout: envVars.DB_TIMEOUT
  },
  
  security: {
    jwtSecret: envVars.JWT_SECRET,
    bcryptRounds: envVars.BCRYPT_ROUNDS
  },
  
  logging: {
    level: envVars.LOG_LEVEL,
    file: envVars.LOG_FILE
  },
  
  cors: {
    origin: envVars.CORS_ORIGIN
  },
  
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS
  }
};

module.exports = config;
