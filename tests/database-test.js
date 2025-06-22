const databaseManager = require('../config/database');
const ProductRepository = require('../repositories/ProductRepository');

/**
 * Simple database connectivity and functionality tests
 * For production, consider using a proper testing framework like Jest or Mocha
 */
class DatabaseTest {
  constructor() {
    this.testResults = [];
  }

  async runTest(testName, testFunction) {
    try {
      console.log(`🧪 Running test: ${testName}`);
      const startTime = Date.now();
      
      await testFunction();
      
      const duration = Date.now() - startTime;
      console.log(`✅ PASSED: ${testName} (${duration}ms)`);
      
      this.testResults.push({
        name: testName,
        status: 'PASSED',
        duration,
        error: null
      });
      
    } catch (error) {
      console.log(`❌ FAILED: ${testName} - ${error.message}`);
      
      this.testResults.push({
        name: testName,
        status: 'FAILED',
        duration: 0,
        error: error.message
      });
    }
  }

  async testDatabaseConnection() {
    await databaseManager.testConnection();
    
    const poolStatus = databaseManager.getPoolStatus();
    if (!poolStatus.connected) {
      throw new Error('Database not connected');
    }
  }

  async testProductCRUD() {
    // Test data
    const testProduct = {
      name: 'Test Product',
      price: 99.99,
      tags: ['test', 'sample'],
      description: 'This is a test product',
      sku: 'TEST-PRODUCT-001',
      stock_quantity: 10
    };

    // CREATE
    const createdProduct = await ProductRepository.create(testProduct);
    if (!createdProduct || !createdProduct.id) {
      throw new Error('Failed to create product');
    }

    // READ
    const foundProduct = await ProductRepository.findById(createdProduct.id);
    if (!foundProduct || foundProduct.name !== testProduct.name) {
      throw new Error('Failed to read product');
    }

    // UPDATE
    const updateData = { name: 'Updated Test Product', price: 149.99 };
    const updatedProduct = await ProductRepository.update(createdProduct.id, updateData);
    if (!updatedProduct || updatedProduct.name !== updateData.name) {
      throw new Error('Failed to update product');
    }

    // DELETE
    await ProductRepository.delete(createdProduct.id);
    const deletedProduct = await ProductRepository.findById(createdProduct.id);
    if (deletedProduct) {
      throw new Error('Failed to delete product');
    }
  }

  async testProductValidation() {
    // Test invalid product data
    try {
      await ProductRepository.create({
        name: '', // Invalid: empty name
        price: -10 // Invalid: negative price
      });
      throw new Error('Validation should have failed');
    } catch (error) {
      if (!error.message.includes('Validation error')) {
        throw new Error('Expected validation error');
      }
    }
  }

  async testProductPagination() {
    // Create some test products first
    const testProducts = [];
    for (let i = 1; i <= 5; i++) {
      const product = await ProductRepository.create({
        name: `Pagination Test Product ${i}`,
        price: i * 10,
        tags: ['pagination', 'test'],
        sku: `PAGINATION-TEST-${i}`
      });
      testProducts.push(product);
    }

    try {
      // Test pagination
      const result = await ProductRepository.findAll({
        page: 1,
        limit: 3,
        search: 'Pagination Test'
      });

      if (!result.data || result.data.length === 0) {
        throw new Error('No products found');
      }

      if (!result.pagination || typeof result.pagination.total !== 'number') {
        throw new Error('Pagination info missing');
      }

      // Clean up test products
      for (const product of testProducts) {
        await ProductRepository.delete(product.id);
      }

    } catch (error) {
      // Clean up test products even if test fails
      for (const product of testProducts) {
        try {
          await ProductRepository.delete(product.id);
        } catch (cleanupError) {
          console.warn(`Failed to cleanup product ${product.id}:`, cleanupError.message);
        }
      }
      throw error;
    }
  }

  async testDatabaseTransactions() {
    // Test transaction functionality
    const testProduct = {
      name: 'Transaction Test Product',
      price: 199.99,
      tags: ['transaction', 'test'],
      sku: 'TRANSACTION-TEST-001'
    };

    await databaseManager.transaction(async (connection) => {
      // This is a simple transaction test
      // In a real scenario, you'd perform multiple related operations
      const sql = `
        INSERT INTO products (name, price, tags, sku, stock_quantity, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        testProduct.name,
        testProduct.price,
        JSON.stringify(testProduct.tags),
        testProduct.sku,
        0,
        true
      ];

      const [result] = await connection.execute(sql, params);
      
      if (!result.insertId) {
        throw new Error('Transaction test failed');
      }

      // Clean up
      await connection.execute('DELETE FROM products WHERE id = ?', [result.insertId]);
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Database Tests\n');

    try {
      // Initialize database connection
      await databaseManager.initialize();
      console.log('✅ Database connection established\n');

      // Run all tests
      await this.runTest('Database Connection', () => this.testDatabaseConnection());
      await this.runTest('Product CRUD Operations', () => this.testProductCRUD());
      await this.runTest('Product Validation', () => this.testProductValidation());
      await this.runTest('Product Pagination', () => this.testProductPagination());
      await this.runTest('Database Transactions', () => this.testDatabaseTransactions());

      // Print summary
      console.log('\n📊 Test Summary:');
      const passed = this.testResults.filter(r => r.status === 'PASSED').length;
      const failed = this.testResults.filter(r => r.status === 'FAILED').length;
      const total = this.testResults.length;

      console.log(`✅ Passed: ${passed}/${total}`);
      console.log(`❌ Failed: ${failed}/${total}`);

      if (failed > 0) {
        console.log('\n❌ Failed Tests:');
        this.testResults
          .filter(r => r.status === 'FAILED')
          .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
      }

      return { passed, failed, total };

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      throw error;
    } finally {
      await databaseManager.close();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// CLI interface
if (require.main === module) {
  const tester = new DatabaseTest();
  
  tester.runAllTests()
    .then((results) => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = DatabaseTest;
