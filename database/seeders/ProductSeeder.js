const ProductRepository = require('../../repositories/ProductRepository');
const databaseManager = require('../../config/database');

class ProductSeeder {
  constructor() {
    this.sampleProducts = [
      {
        name: 'Nike Air Max 90',
        price: 120.00,
        tags: ['shoes', 'sport', 'nike', 'running'],
        description: 'Classic Nike Air Max 90 sneakers with iconic visible air cushioning.',
        sku: 'NIKE-AM90-001',
        stock_quantity: 50
      },
      {
        name: 'Apple iPhone 15 Pro',
        price: 999.99,
        tags: ['electronics', 'smartphone', 'apple', 'mobile'],
        description: 'Latest iPhone 15 Pro with advanced camera system and A17 Pro chip.',
        sku: 'APPLE-IP15P-128',
        stock_quantity: 25
      },
      {
        name: 'Samsung 4K Smart TV 55"',
        price: 799.00,
        tags: ['electronics', 'tv', 'samsung', '4k', 'smart'],
        description: '55-inch 4K UHD Smart TV with HDR and built-in streaming apps.',
        sku: 'SAMSUNG-TV55-4K',
        stock_quantity: 15
      },
      {
        name: 'Adidas Ultraboost 22',
        price: 180.00,
        tags: ['shoes', 'sport', 'adidas', 'running', 'boost'],
        description: 'Premium running shoes with responsive Boost midsole technology.',
        sku: 'ADIDAS-UB22-BLK',
        stock_quantity: 30
      },
      {
        name: 'Sony WH-1000XM5 Headphones',
        price: 399.99,
        tags: ['electronics', 'audio', 'sony', 'wireless', 'noise-cancelling'],
        description: 'Industry-leading noise canceling wireless headphones.',
        sku: 'SONY-WH1000XM5',
        stock_quantity: 40
      },
      {
        name: 'MacBook Pro 14" M3',
        price: 1999.00,
        tags: ['electronics', 'laptop', 'apple', 'macbook', 'professional'],
        description: 'MacBook Pro 14-inch with M3 chip for professional workflows.',
        sku: 'APPLE-MBP14-M3',
        stock_quantity: 10
      },
      {
        name: 'Levi\'s 501 Original Jeans',
        price: 89.99,
        tags: ['clothing', 'jeans', 'levis', 'denim', 'classic'],
        description: 'The original blue jean since 1873. Classic straight fit.',
        sku: 'LEVIS-501-BLUE-32',
        stock_quantity: 75
      },
      {
        name: 'Nintendo Switch OLED',
        price: 349.99,
        tags: ['electronics', 'gaming', 'nintendo', 'console', 'portable'],
        description: 'Nintendo Switch with vibrant 7-inch OLED screen.',
        sku: 'NINTENDO-SW-OLED',
        stock_quantity: 20
      },
      {
        name: 'Dyson V15 Detect Vacuum',
        price: 749.99,
        tags: ['appliances', 'vacuum', 'dyson', 'cordless', 'cleaning'],
        description: 'Powerful cordless vacuum with laser dust detection.',
        sku: 'DYSON-V15-DETECT',
        stock_quantity: 12
      },
      {
        name: 'Patagonia Better Sweater Fleece',
        price: 99.00,
        tags: ['clothing', 'fleece', 'patagonia', 'outdoor', 'sustainable'],
        description: 'Classic fleece jacket made from recycled polyester.',
        sku: 'PATAGONIA-BS-NAVY-L',
        stock_quantity: 35
      }
    ];
  }

  async seed() {
    try {
      console.log('Starting product seeding...');
      
      // Initialize database connection if not already connected
      if (!databaseManager.isConnected) {
        await databaseManager.initialize();
      }

      let createdCount = 0;
      let skippedCount = 0;

      for (const productData of this.sampleProducts) {
        try {
          // Check if product with this SKU already exists
          const exists = await ProductRepository.skuExists(productData.sku);
          
          if (exists) {
            console.log(`⚠️  Product with SKU ${productData.sku} already exists, skipping...`);
            skippedCount++;
            continue;
          }

          // Create the product
          const product = await ProductRepository.create(productData);
          console.log(`✓ Created product: ${product.name} (ID: ${product.id})`);
          createdCount++;
          
        } catch (error) {
          console.error(`✗ Failed to create product ${productData.name}:`, error.message);
        }
      }

      console.log('\n📊 Seeding Summary:');
      console.log(`✓ Created: ${createdCount} products`);
      console.log(`⚠️  Skipped: ${skippedCount} products (already exist)`);
      console.log(`📦 Total sample products: ${this.sampleProducts.length}`);
      
      return {
        created: createdCount,
        skipped: skippedCount,
        total: this.sampleProducts.length
      };

    } catch (error) {
      console.error('❌ Seeding failed:', error.message);
      throw error;
    }
  }

  async clear() {
    try {
      console.log('⚠️  Clearing all products...');
      
      // Initialize database connection if not already connected
      if (!databaseManager.isConnected) {
        await databaseManager.initialize();
      }

      // Get all products and delete them
      const result = await ProductRepository.findAll({ limit: 1000 });
      
      let deletedCount = 0;
      for (const product of result.data) {
        try {
          await ProductRepository.delete(product.id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete product ${product.id}:`, error.message);
        }
      }

      console.log(`✓ Deleted ${deletedCount} products`);
      return deletedCount;

    } catch (error) {
      console.error('❌ Clear failed:', error.message);
      throw error;
    }
  }

  async reset() {
    try {
      console.log('🔄 Resetting products (clear + seed)...');
      
      const deletedCount = await this.clear();
      console.log(`\n🗑️  Cleared ${deletedCount} existing products`);
      
      const seedResult = await this.seed();
      console.log(`\n🌱 Seeded ${seedResult.created} new products`);
      
      return {
        deleted: deletedCount,
        ...seedResult
      };

    } catch (error) {
      console.error('❌ Reset failed:', error.message);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const seeder = new ProductSeeder();
  
  const command = process.argv[2];
  
  const runCommand = async () => {
    try {
      switch (command) {
        case 'seed':
          await seeder.seed();
          break;
          
        case 'clear':
          await seeder.clear();
          break;
          
        case 'reset':
          await seeder.reset();
          break;
          
        default:
          console.log('Usage:');
          console.log('  node ProductSeeder.js seed   - Add sample products');
          console.log('  node ProductSeeder.js clear  - Remove all products');
          console.log('  node ProductSeeder.js reset  - Clear and re-seed products');
          process.exit(1);
      }
      
      process.exit(0);
    } catch (error) {
      console.error('Command failed:', error.message);
      process.exit(1);
    } finally {
      await databaseManager.close();
    }
  };

  runCommand();
}

module.exports = ProductSeeder;
