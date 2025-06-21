const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

class MigrationRunner {
  constructor() {
    this.connection = null;
    this.migrationsDir = path.join(__dirname, 'migrations');
  }

  async connect() {
    try {
      // First connect without database to create it if needed
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
      });

      console.log('Connected to MySQL server');
    } catch (error) {
      console.error('Failed to connect to MySQL:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await this.connection.end();
      console.log('Disconnected from MySQL');
    }
  }

  async getMigrationFiles() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      return files
        .filter(file => file.endsWith('.sql'))
        .sort(); // Ensure migrations run in order
    } catch (error) {
      console.error('Failed to read migrations directory:', error.message);
      return [];
    }
  }

  async getExecutedMigrations() {
    try {
      // First ensure we're using the correct database
      await this.connection.execute(`USE ${process.env.DB_NAME || 'my_backend_db'}`);
      
      const [rows] = await this.connection.execute(
        'SELECT migration_name FROM migrations ORDER BY executed_at'
      );
      return rows.map(row => row.migration_name);
    } catch (error) {
      // If migrations table doesn't exist, return empty array
      console.log('Migrations table not found, will be created during first migration');
      return [];
    }
  }

  async executeMigration(filename) {
    try {
      const filePath = path.join(this.migrationsDir, filename);
      const sql = await fs.readFile(filePath, 'utf8');
      
      console.log(`Executing migration: ${filename}`);
      
      // Execute the migration SQL
      await this.connection.execute(sql);
      
      console.log(`✓ Migration ${filename} executed successfully`);
    } catch (error) {
      console.error(`✗ Failed to execute migration ${filename}:`, error.message);
      throw error;
    }
  }

  async runMigrations() {
    try {
      await this.connect();
      
      const migrationFiles = await this.getMigrationFiles();
      const executedMigrations = await this.getExecutedMigrations();
      
      const pendingMigrations = migrationFiles.filter(
        file => !executedMigrations.includes(file)
      );
      
      if (pendingMigrations.length === 0) {
        console.log('No pending migrations found');
        return;
      }
      
      console.log(`Found ${pendingMigrations.length} pending migration(s)`);
      
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      console.log('All migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async rollback(migrationName) {
    console.log(`Rollback functionality not implemented for: ${migrationName}`);
    console.log('For production systems, implement proper rollback scripts');
  }
}

// CLI interface
if (require.main === module) {
  const runner = new MigrationRunner();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'up':
      runner.runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    case 'rollback':
      const migrationName = process.argv[3];
      if (!migrationName) {
        console.error('Please specify migration name to rollback');
        process.exit(1);
      }
      runner.rollback(migrationName)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
      break;
      
    default:
      console.log('Usage:');
      console.log('  node migrate.js up          - Run pending migrations');
      console.log('  node migrate.js rollback <name> - Rollback specific migration');
      process.exit(1);
  }
}

module.exports = MigrationRunner;
