-- Seed categories table with sample data

INSERT IGNORE INTO categories (name, description, slug, sort_order, is_active) VALUES
('Electronics', 'Electronic devices and gadgets', 'electronics', 1, TRUE),
('Clothing', 'Fashion and apparel', 'clothing', 2, TRUE),
('Books', 'Books and educational materials', 'books', 3, TRUE),
('Sports', 'Sports equipment and accessories', 'sports', 4, TRUE),
('Home & Garden', 'Home improvement and garden supplies', 'home-garden', 5, TRUE);

-- Add subcategories
INSERT IGNORE INTO categories (name, description, slug, parent_id, sort_order, is_active) VALUES
('Smartphones', 'Mobile phones and accessories', 'smartphones', 1, 1, TRUE),
('Laptops', 'Laptop computers and accessories', 'laptops', 1, 2, TRUE),
('Headphones', 'Audio equipment and headphones', 'headphones', 1, 3, TRUE),
('Men Clothing', 'Clothing for men', 'men-clothing', 2, 1, TRUE),
('Women Clothing', 'Clothing for women', 'women-clothing', 2, 2, TRUE),
('Fiction', 'Fiction books and novels', 'fiction', 3, 1, TRUE),
('Non-Fiction', 'Non-fiction and educational books', 'non-fiction', 3, 2, TRUE);
