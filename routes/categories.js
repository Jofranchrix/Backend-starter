const express = require('express');
const CategoryRepository = require('../repositories/CategoryRepository');
const { authenticate, managerOrAdmin, extractUser } = require('../middleware/auth');
const Category = require('../models/Category');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         slug:
 *           type: string
 *         parent_id:
 *           type: integer
 *           nullable: true
 *         is_active:
 *           type: boolean
 *         sort_order:
 *           type: integer
 *         image_url:
 *           type: string
 *         meta_title:
 *           type: string
 *         meta_description:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
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
 *         name: parent_id
 *         schema:
 *           type: string
 *         description: Use 'null' for root categories, or specific ID for subcategories
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: include_children
 *         schema:
 *           type: boolean
 *           default: false
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [id, name, sort_order, created_at]
 *           default: sort_order
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get('/', extractUser, async (req, res) => {
  try {
    const result = await CategoryRepository.findAll(req.query);

    res.json({
      message: 'Categories retrieved successfully',
      data: result.data.map(category => category.toJSON()),
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get categories error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve categories'
    });
  }
});

/**
 * @swagger
 * /api/categories/tree:
 *   get:
 *     summary: Get categories in tree structure
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Category tree retrieved successfully
 */
router.get('/tree', extractUser, async (req, res) => {
  try {
    const tree = await CategoryRepository.getTree();

    res.json({
      message: 'Category tree retrieved successfully',
      data: tree
    });
  } catch (error) {
    console.error('Get category tree error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve category tree'
    });
  }
});

/**
 * @swagger
 * /api/categories/statistics:
 *   get:
 *     summary: Get category statistics (Manager/Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/statistics', managerOrAdmin, async (req, res) => {
  try {
    const stats = await CategoryRepository.getStatistics();

    res.json({
      message: 'Category statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Category statistics error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve statistics'
    });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get('/:id', extractUser, async (req, res) => {
  try {
    const category = await CategoryRepository.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Category not found'
      });
    }

    res.json({
      message: 'Category retrieved successfully',
      data: category.toJSON()
    });
  } catch (error) {
    console.error('Get category error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve category'
    });
  }
});

/**
 * @swagger
 * /api/categories/slug/{slug}:
 *   get:
 *     summary: Get category by slug
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get('/slug/:slug', extractUser, async (req, res) => {
  try {
    const category = await CategoryRepository.findBySlug(req.params.slug);

    if (!category) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Category not found'
      });
    }

    res.json({
      message: 'Category retrieved successfully',
      data: category.toJSON()
    });
  } catch (error) {
    console.error('Get category by slug error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve category'
    });
  }
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create new category (Manager/Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               slug:
 *                 type: string
 *               parent_id:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *               sort_order:
 *                 type: integer
 *               image_url:
 *                 type: string
 *               meta_title:
 *                 type: string
 *               meta_description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Category slug already exists
 */
router.post('/', managerOrAdmin, async (req, res) => {
  try {
    const category = await CategoryRepository.create(req.body);

    res.status(201).json({
      message: 'Category created successfully',
      data: category.toJSON()
    });
  } catch (error) {
    console.error('Create category error:', error.message);
    
    if (error.message.includes('Validation error')) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message
      });
    }
    
    if (error.message.includes('slug already exists')) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Category slug already exists'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create category'
    });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update category (Manager/Admin only)
 *     tags: [Categories]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               slug:
 *                 type: string
 *               parent_id:
 *                 type: integer
 *               is_active:
 *                 type: boolean
 *               sort_order:
 *                 type: integer
 *               image_url:
 *                 type: string
 *               meta_title:
 *                 type: string
 *               meta_description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Category not found
 */
router.put('/:id', managerOrAdmin, async (req, res) => {
  try {
    const category = await CategoryRepository.update(req.params.id, req.body);

    res.json({
      message: 'Category updated successfully',
      data: category.toJSON()
    });
  } catch (error) {
    console.error('Update category error:', error.message);
    
    if (error.message.includes('Validation error')) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message
      });
    }
    
    if (error.message.includes('Category not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Category not found'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update category'
    });
  }
});

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete category (Manager/Admin only)
 *     tags: [Categories]
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
 *         description: Category deleted successfully
 *       400:
 *         description: Cannot delete category with subcategories or products
 *       404:
 *         description: Category not found
 */
router.delete('/:id', managerOrAdmin, async (req, res) => {
  try {
    const deleted = await CategoryRepository.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Category not found'
      });
    }

    res.json({
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error.message);
    
    if (error.message.includes('Cannot delete category')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete category'
    });
  }
});

module.exports = router;
