const jwt = require('jsonwebtoken');
const UserRepository = require('../repositories/UserRepository');

/**
 * Authentication and Authorization Middleware
 */

/**
 * JWT Secret (in production, use environment variable)
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate JWT token for user
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
}

/**
 * Authentication middleware - Verify JWT token
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authorization header provided'
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const user = await UserRepository.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Account is deactivated'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }
}

/**
 * Authorization middleware - Check user roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
}

/**
 * Optional authentication middleware - Don't fail if no token
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return next();
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const user = await UserRepository.findById(decoded.id);
    if (user && user.is_active) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
}

/**
 * Admin only middleware
 */
const adminOnly = [authenticate, authorize('admin')];

/**
 * Manager or Admin middleware
 */
const managerOrAdmin = [authenticate, authorize('manager', 'admin')];

/**
 * Customer or higher middleware
 */
const customerOrHigher = [authenticate, authorize('customer', 'manager', 'admin')];

/**
 * Rate limiting middleware for authentication endpoints
 */
const authRateLimit = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Clean old attempts
    for (const [ip, data] of attempts.entries()) {
      if (now - data.firstAttempt > windowMs) {
        attempts.delete(ip);
      }
    }

    const userAttempts = attempts.get(key);
    
    if (!userAttempts) {
      attempts.set(key, {
        count: 1,
        firstAttempt: now
      });
      return next();
    }

    if (userAttempts.count >= maxAttempts) {
      const timeLeft = Math.ceil((windowMs - (now - userAttempts.firstAttempt)) / 1000 / 60);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Too many authentication attempts. Try again in ${timeLeft} minutes.`
      });
    }

    userAttempts.count++;
    next();
  };
};

/**
 * Middleware to check if user owns resource or is admin
 */
function ownerOrAdmin(userIdField = 'user_id') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[userIdField] || req.body[userIdField];
    
    if (resourceUserId && parseInt(resourceUserId) === req.user.id) {
      return next();
    }

    return res.status(403).json({
      error: 'Forbidden',
      message: 'You can only access your own resources'
    });
  };
}

/**
 * Middleware to extract user info from token without requiring authentication
 */
async function extractUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (token) {
        const decoded = verifyToken(token);
        const user = await UserRepository.findById(decoded.id);
        
        if (user && user.is_active) {
          req.user = user;
        }
      }
    }
  } catch (error) {
    // Ignore errors, just continue without user
  }
  
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  optionalAuth,
  adminOnly,
  managerOrAdmin,
  customerOrHigher,
  authRateLimit,
  ownerOrAdmin,
  extractUser
};
