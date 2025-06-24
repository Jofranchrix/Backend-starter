const express = require('express');
const UserRepository = require('../repositories/UserRepository');
const { authenticate, authorize, adminOnly, managerOrAdmin, ownerOrAdmin } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin/Manager only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [customer, manager, admin]
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [id, first_name, last_name, email, created_at]
 *           default: created_at
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       403:
 *         description: Insufficient permissions
 */
router.get('/', managerOrAdmin, async (req, res) => {
  try {
    const result = await UserRepository.findAll(req.query);

    res.json({
      message: 'Users retrieved successfully',
      data: result.data.map(user => user.toJSON()),
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get users error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve users'
    });
  }
});

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search users (Admin/Manager only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [customer, manager, admin]
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Search term required
 */
router.get('/search', managerOrAdmin, async (req, res) => {
  try {
    const { q: searchTerm, role, is_active } = req.query;

    if (!searchTerm) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Search term (q) is required'
      });
    }

    const filters = {};
    if (role) filters.role = role;
    if (is_active !== undefined) filters.is_active = is_active === 'true';

    const users = await UserRepository.search(searchTerm, filters);

    res.json({
      message: 'Search completed successfully',
      data: users.map(user => user.toJSON()),
      count: users.length
    });
  } catch (error) {
    console.error('User search error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Search failed'
    });
  }
});

/**
 * @swagger
 * /api/users/statistics:
 *   get:
 *     summary: Get user statistics (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/statistics', adminOnly, async (req, res) => {
  try {
    const stats = await UserRepository.getStatistics();

    res.json({
      message: 'User statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('User statistics error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve statistics'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/:id', authenticate, ownerOrAdmin('id'), async (req, res) => {
  try {
    const user = await UserRepository.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json({
      message: 'User retrieved successfully',
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve user'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 */
router.put('/:id', authenticate, ownerOrAdmin('id'), async (req, res) => {
  try {
    // Non-admin users can't change is_active status
    if (req.user.role !== 'admin' && req.body.is_active !== undefined) {
      delete req.body.is_active;
    }

    const user = await UserRepository.update(req.params.id, req.body);

    res.json({
      message: 'User updated successfully',
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Update user error:', error.message);
    
    if (error.message.includes('Validation error')) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message
      });
    }
    
    if (error.message.includes('User not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}/deactivate:
 *   put:
 *     summary: Deactivate user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *       404:
 *         description: User not found
 */
router.put('/:id/deactivate', adminOnly, async (req, res) => {
  try {
    const user = await UserRepository.softDelete(req.params.id);

    res.json({
      message: 'User deactivated successfully',
      data: user.toJSON()
    });
  } catch (error) {
    console.error('Deactivate user error:', error.message);
    
    if (error.message.includes('User not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to deactivate user'
    });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user permanently (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const deleted = await UserRepository.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete user'
    });
  }
});

module.exports = router;
