/**
 * Minimal server test to isolate the issue
 */

require('dotenv').config();
const express = require('express');
const databaseManager = require('./config/database');

const app = express();
const port = 3000;

// Basic middleware
app.use(express.json());

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const connection = await databaseManager.getConnection();
    const [rows] = await connection.execute('SELECT 1 as test');
    connection.release();
    res.json({ message: 'Database connection working', result: rows[0] });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test categories table
app.get('/test-categories-table', async (req, res) => {
  try {
    const connection = await databaseManager.getConnection();
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM categories');
    connection.release();
    res.json({ message: 'Categories table accessible', count: rows[0].count });
  } catch (error) {
    console.error('Categories table test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
async function startMinimalServer() {
  try {
    console.log('Initializing database...');
    await databaseManager.initialize();
    console.log('✓ Database connected');

    app.listen(port, () => {
      console.log(`✓ Minimal server running on http://localhost:${port}`);
      console.log('Test routes:');
      console.log('  GET /test - Basic test');
      console.log('  GET /test-db - Database connection test');
      console.log('  GET /test-categories-table - Categories table test');
    });
  } catch (error) {
    console.error('Failed to start minimal server:', error);
    process.exit(1);
  }
}

startMinimalServer();
