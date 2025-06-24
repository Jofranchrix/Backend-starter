-- Seed users table with sample data
-- Password for all users: Password123!

INSERT IGNORE INTO users (email, password, first_name, last_name, phone, role, is_active, email_verified) VALUES
('admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO9G', 'System', 'Administrator', '+2348012345678', 'admin', TRUE, TRUE),
('manager@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO9G', 'John', 'Manager', '+2348012345679', 'manager', TRUE, TRUE),
('customer1@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO9G', 'Alice', 'Johnson', '+2348012345680', 'customer', TRUE, TRUE),
('customer2@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO9G', 'Bob', 'Smith', '+2348012345681', 'customer', TRUE, TRUE),
('customer3@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO9G', 'Carol', 'Davis', '+2348012345682', 'customer', TRUE, FALSE);
