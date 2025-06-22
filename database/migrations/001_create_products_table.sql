-- Migration: Create products table
-- Created: 2025-06-21
-- Description: Initial products table with proper indexing and constraints

-- Note: Database connection is handled by the migration script

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    tags JSON,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    stock_quantity INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_price_positive CHECK (price >= 0),
    CONSTRAINT chk_stock_non_negative CHECK (stock_quantity >= 0),
    
    -- Indexes for performance
    INDEX idx_name (name),
    INDEX idx_price (price),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at),
    INDEX idx_sku (sku),
    
    -- Composite indexes for common queries
    INDEX idx_active_price (is_active, price),
    INDEX idx_active_created (is_active, created_at)
) ENGINE=InnoDB 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci
  COMMENT='Products table with enterprise-grade structure';

-- Migration tracking is handled by the migration script
