const express = require('express');
const UserRepository = require('../repositories/UserRepository');
const { generateToken, authenticate, authRateLimit } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         email:
 *           type: string
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         phone:
 *           type: string
 *         role:
 *           type: string
 *           enum: [customer, manager, admin]
 *         is_active:
 *           type: boolean
 *         email_verified:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - first_name
 *         - last_name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         phone:
 *           type: string
 *     AuthResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         user:
 *           $ref: '#/components/schemas/User'
 *         token:
 *           type: string
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post('/register', authRateLimit(10, 15 * 60 * 1000), async (req, res) => {
  try {
    const user = await UserRepository.create(req.body);
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    
    if (error.message.includes('Validation error')) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message
      });
    }
    
    if (error.message.includes('Email already exists')) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Email already exists'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Registration failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authRateLimit(5, 15 * 60 * 1000), async (req, res) => {
  try {
    const { error, value } = User.validateLogin(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details.map(d => d.message).join(', ')
      });
    }

    const user = await UserRepository.authenticate(value.email, value.password);
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Login error:', error.message);
    
    if (error.message.includes('Invalid email or password') || 
        error.message.includes('Account is deactivated')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      message: 'User profile retrieved successfully',
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Profile retrieval error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve profile'
    });
  }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *               - confirm_password
 *             properties:
 *               current_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *                 minLength: 8
 *               confirm_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Current password incorrect
 */
router.put('/change-password', authenticate, async (req, res) => {
  try {
    await UserRepository.updatePassword(req.user.id, req.body);

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error.message);
    
    if (error.message.includes('Validation error')) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message
      });
    }
    
    if (error.message.includes('Current password is incorrect')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Current password is incorrect'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Password change failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user (client-side token invalidation)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // The client should remove the token from storage
    // For enhanced security, you could implement a token blacklist
    
    res.json({
      message: 'Logout successful. Please remove the token from client storage.'
    });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Logout failed'
    });
  }
});

module.exports = router;
