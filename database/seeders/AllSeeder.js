require('dotenv').config();
const databaseManager = require('../../config/database');

/**
 * Comprehensive seeder for all tables
 */
class AllSeeder {
  async seedUsers() {
    console.log('🔐 Seeding users...');
    
    const connection = await databaseManager.getConnection();
    try {
      // Password for all users: Password123!
      const users = [
        ['admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO9G', 'System', 'Administrator', '+2348012345678', 'admin', true, true],
        ['manager@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO9G', 'John', 'Manager', '+2348012345679', 'manager', true, true],
        ['customer1@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO9G', 'Alice', 'Johnson', '+2348012345680', 'customer', true, true],
        ['customer2@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO9G', 'Bob', 'Smith', '+2348012345681', 'customer', true, true],
        ['customer3@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO9G', 'Carol', 'Davis', '+2348012345682', 'customer', true, false]
      ];

      let created = 0;
      for (const user of users) {
        try {
          await connection.execute(
            'INSERT IGNORE INTO users (email, password, first_name, last_name, phone, role, is_active, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            user
          );
          console.log(`✓ User: ${user[2]} ${user[3]} (${user[0]})`);
          created++;
        } catch (error) {
          console.log(`⚠️  User ${user[0]} already exists`);
        }
      }
      
      console.log(`✓ Created ${created} users\n`);
    } finally {
      connection.release();
    }
  }

  async seedCategories() {
    console.log('📂 Seeding categories...');
    
    const connection = await databaseManager.getConnection();
    try {
      // Main categories
      const mainCategories = [
        ['Electronics', 'Electronic devices and gadgets', 'electronics', null, 1, true],
        ['Clothing', 'Fashion and apparel', 'clothing', null, 2, true],
        ['Books', 'Books and educational materials', 'books', null, 3, true],
        ['Sports', 'Sports equipment and accessories', 'sports', null, 4, true],
        ['Home & Garden', 'Home improvement and garden supplies', 'home-garden', null, 5, true]
      ];

      let created = 0;
      for (const category of mainCategories) {
        try {
          await connection.execute(
            'INSERT IGNORE INTO categories (name, description, slug, parent_id, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            category
          );
          console.log(`✓ Category: ${category[0]}`);
          created++;
        } catch (error) {
          console.log(`⚠️  Category ${category[0]} already exists`);
        }
      }

      // Subcategories
      const subCategories = [
        ['Smartphones', 'Mobile phones and accessories', 'smartphones', 1, 1, true],
        ['Laptops', 'Laptop computers and accessories', 'laptops', 1, 2, true],
        ['Headphones', 'Audio equipment and headphones', 'headphones', 1, 3, true],
        ['Men Clothing', 'Clothing for men', 'men-clothing', 2, 1, true],
        ['Women Clothing', 'Clothing for women', 'women-clothing', 2, 2, true],
        ['Fiction', 'Fiction books and novels', 'fiction', 3, 1, true],
        ['Non-Fiction', 'Non-fiction and educational books', 'non-fiction', 3, 2, true]
      ];

      for (const category of subCategories) {
        try {
          await connection.execute(
            'INSERT IGNORE INTO categories (name, description, slug, parent_id, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
            category
          );
          console.log(`✓ Subcategory: ${category[0]}`);
          created++;
        } catch (error) {
          console.log(`⚠️  Category ${category[0]} already exists`);
        }
      }
      
      console.log(`✓ Created ${created} categories\n`);
    } finally {
      connection.release();
    }
  }

  async updateProductCategories() {
    console.log('🔗 Updating product categories...');
    
    const connection = await databaseManager.getConnection();
    try {
      // Map products to categories based on their tags
      const productCategoryMappings = [
        { sku: 'NIKE-AM90-001', category_id: 4 }, // Sports
        { sku: 'APPLE-IP15P-128', category_id: 6 }, // Smartphones
        { sku: 'SAMSUNG-TV55-4K', category_id: 1 }, // Electronics
        { sku: 'ADIDAS-UB22-BLK', category_id: 4 }, // Sports
        { sku: 'SONY-WH1000XM5', category_id: 8 }, // Headphones
        { sku: 'APPLE-MBP14-M3', category_id: 7 }, // Laptops
        { sku: 'LEVIS-501-BLUE-32', category_id: 2 }, // Clothing
        { sku: 'NINTENDO-SW-OLED', category_id: 1 }, // Electronics
        { sku: 'DYSON-V15-DETECT', category_id: 5 }, // Home & Garden
        { sku: 'PATAGONIA-BS-NAVY-L', category_id: 2 } // Clothing
      ];

      let updated = 0;
      for (const mapping of productCategoryMappings) {
        try {
          const [result] = await connection.execute(
            'UPDATE products SET category_id = ? WHERE sku = ?',
            [mapping.category_id, mapping.sku]
          );
          
          if (result.affectedRows > 0) {
            console.log(`✓ Updated product ${mapping.sku} → category ${mapping.category_id}`);
            updated++;
          }
        } catch (error) {
          console.log(`⚠️  Failed to update product ${mapping.sku}`);
        }
      }
      
      console.log(`✓ Updated ${updated} product categories\n`);
    } finally {
      connection.release();
    }
  }

  async seedSampleOrders() {
    console.log('🛒 Seeding sample orders...');
    
    const connection = await databaseManager.getConnection();
    try {
      // Sample orders
      const orders = [
        {
          user_id: 3, // Alice Johnson
          order_number: `ORD-${Date.now()}-001`,
          status: 'delivered',
          total_amount: 219.99,
          subtotal: 199.99,
          tax_amount: 20.00,
          shipping_amount: 0.00,
          discount_amount: 0.00,
          payment_status: 'paid',
          payment_method: 'card',
          shipping_address: JSON.stringify({
            first_name: 'Alice',
            last_name: 'Johnson',
            address_line_1: '123 Main Street',
            city: 'Lagos',
            state: 'Lagos',
            postal_code: '100001',
            country: 'Nigeria',
            phone: '+2348012345680'
          }),
          notes: 'Please deliver during business hours'
        },
        {
          user_id: 4, // Bob Smith
          order_number: `ORD-${Date.now()}-002`,
          status: 'processing',
          total_amount: 1089.98,
          subtotal: 999.98,
          tax_amount: 89.99,
          shipping_amount: 0.01,
          discount_amount: 0.00,
          payment_status: 'paid',
          payment_method: 'bank_transfer',
          shipping_address: JSON.stringify({
            first_name: 'Bob',
            last_name: 'Smith',
            address_line_1: '456 Oak Avenue',
            city: 'Abuja',
            state: 'FCT',
            postal_code: '900001',
            country: 'Nigeria',
            phone: '+2348012345681'
          }),
          notes: 'Handle with care - electronics'
        }
      ];

      let created = 0;
      for (const order of orders) {
        try {
          const [result] = await connection.execute(`
            INSERT INTO orders (
              user_id, order_number, status, total_amount, subtotal, 
              tax_amount, shipping_amount, discount_amount, payment_status, 
              payment_method, shipping_address, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            order.user_id, order.order_number, order.status, order.total_amount,
            order.subtotal, order.tax_amount, order.shipping_amount, order.discount_amount,
            order.payment_status, order.payment_method, order.shipping_address, order.notes
          ]);

          console.log(`✓ Order: ${order.order_number} for user ${order.user_id}`);
          
          // Add order items
          const orderId = result.insertId;
          if (order.user_id === 3) {
            // Alice's order - Nike shoes
            await connection.execute(`
              INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [orderId, 1, 'Nike Air Max 90', 1, 120.00, 120.00]);
            
            await connection.execute(`
              INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [orderId, 7, "Levi's 501 Original Jeans", 1, 89.99, 89.99]);
          } else {
            // Bob's order - iPhone
            await connection.execute(`
              INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [orderId, 2, 'Apple iPhone 15 Pro', 1, 999.99, 999.99]);
          }
          
          created++;
        } catch (error) {
          console.log(`⚠️  Failed to create order: ${error.message}`);
        }
      }
      
      console.log(`✓ Created ${created} sample orders\n`);
    } finally {
      connection.release();
    }
  }

  async seedAll() {
    try {
      console.log('🌱 Starting comprehensive seeding...\n');
      
      // Initialize database connection
      if (!databaseManager.isConnected) {
        await databaseManager.initialize();
      }

      await this.seedUsers();
      await this.seedCategories();
      await this.updateProductCategories();
      await this.seedSampleOrders();
      
      console.log('🎉 All seeding completed successfully!');
      
    } catch (error) {
      console.error('❌ Seeding failed:', error.message);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const seeder = new AllSeeder();
  
  const runSeeding = async () => {
    try {
      await seeder.seedAll();
      process.exit(0);
    } catch (error) {
      console.error('Seeding failed:', error.message);
      process.exit(1);
    } finally {
      await databaseManager.close();
    }
  };

  runSeeding();
}

module.exports = AllSeeder;
