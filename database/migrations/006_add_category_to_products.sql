-- Migration: Add category_id to products table
-- Description: Add category relationship to products

ALTER TABLE products
ADD COLUMN category_id INT DEFAULT NULL AFTER tags;
