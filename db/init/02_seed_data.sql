-- =============================================================================
-- 개발 환경용 시드 데이터
-- =============================================================================

-- 테스트 사용자 추가 (비밀번호는 bcrypt로 해시된 'password123')
INSERT INTO users (email, password_hash, name, role, is_active, email_verified) VALUES
    ('admin@guardianx.com', '$2b$10$YourHashedPasswordHere', 'Admin User', 'admin', true, true),
    ('john.doe@example.com', '$2b$10$YourHashedPasswordHere', 'John Doe', 'user', true, true),
    ('jane.smith@example.com', '$2b$10$YourHashedPasswordHere', 'Jane Smith', 'moderator', true, true),
    ('test.user@example.com', '$2b$10$YourHashedPasswordHere', 'Test User', 'user', true, false),
    ('inactive.user@example.com', '$2b$10$YourHashedPasswordHere', 'Inactive User', 'user', false, false)
ON CONFLICT (email) DO NOTHING;

-- 사용자 프로필 추가
INSERT INTO user_profiles (user_id, bio, avatar_url, location, website)
SELECT 
    id,
    CASE 
        WHEN email = 'admin@guardianx.com' THEN 'System Administrator'
        WHEN email = 'john.doe@example.com' THEN 'Software Developer passionate about building great products'
        WHEN email = 'jane.smith@example.com' THEN 'Community Moderator and Tech Enthusiast'
        ELSE 'GuardianX User'
    END,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=' || id,
    CASE 
        WHEN email = 'admin@guardianx.com' THEN 'Seoul, Korea'
        WHEN email = 'john.doe@example.com' THEN 'San Francisco, USA'
        WHEN email = 'jane.smith@example.com' THEN 'London, UK'
        ELSE 'Earth'
    END,
    CASE 
        WHEN email = 'john.doe@example.com' THEN 'https://johndoe.dev'
        WHEN email = 'jane.smith@example.com' THEN 'https://janesmith.blog'
        ELSE NULL
    END
FROM users
WHERE email IN (
    'admin@guardianx.com',
    'john.doe@example.com',
    'jane.smith@example.com',
    'test.user@example.com'
)
ON CONFLICT (user_id) DO NOTHING;

-- 샘플 제품 데이터 추가
INSERT INTO products (name, description, price, category, stock_quantity, image_url, is_active, created_by)
SELECT 
    product_name,
    product_description,
    product_price,
    product_category,
    product_stock,
    product_image,
    true,
    (SELECT id FROM users WHERE email = 'admin@guardianx.com' LIMIT 1)
FROM (VALUES
    ('MacBook Pro 16"', 'High-performance laptop for professionals', 2499.99, 'Electronics', 15, 'https://picsum.photos/seed/mbp16/400/300', 50),
    ('iPhone 15 Pro', 'Latest flagship smartphone', 1199.99, 'Electronics', 25, 'https://picsum.photos/seed/iphone15/400/300', 100),
    ('AirPods Pro', 'Premium wireless earbuds with noise cancellation', 249.99, 'Electronics', 50, 'https://picsum.photos/seed/airpods/400/300', 200),
    ('Ergonomic Office Chair', 'Comfortable chair for long working hours', 599.99, 'Furniture', 30, 'https://picsum.photos/seed/chair/400/300', 75),
    ('Standing Desk', 'Height-adjustable desk for healthy work', 799.99, 'Furniture', 20, 'https://picsum.photos/seed/desk/400/300', 40),
    ('4K Webcam', 'Professional webcam for video calls', 199.99, 'Electronics', 40, 'https://picsum.photos/seed/webcam/400/300', 150),
    ('Mechanical Keyboard', 'RGB mechanical keyboard for gaming and productivity', 149.99, 'Electronics', 35, 'https://picsum.photos/seed/keyboard/400/300', 120),
    ('Wireless Mouse', 'Ergonomic wireless mouse with precision tracking', 79.99, 'Electronics', 60, 'https://picsum.photos/seed/mouse/400/300', 300),
    ('Monitor 27" 4K', 'Ultra HD monitor for creative professionals', 699.99, 'Electronics', 25, 'https://picsum.photos/seed/monitor/400/300', 60),
    ('USB-C Hub', 'Multi-port hub for modern laptops', 89.99, 'Electronics', 80, 'https://picsum.photos/seed/hub/400/300', 250)
) AS t(product_name, product_description, product_price, product_category, product_stock, product_image, product_quantity)
ON CONFLICT DO NOTHING;

-- API 키 샘플 데이터 (개발 환경용)
INSERT INTO api_keys (user_id, name, key_hash, is_active, permissions)
SELECT 
    id,
    'Development API Key',
    '$2b$10$SampleHashedAPIKey',
    true,
    '["read:users", "write:users", "read:products", "write:products"]'::jsonb
FROM users
WHERE email = 'admin@guardianx.com'
ON CONFLICT DO NOTHING;

-- 감사 로그 샘플 데이터
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
SELECT 
    u.id,
    action_type,
    'user',
    u.id,
    jsonb_build_object('email', u.email, 'name', u.name),
    '127.0.0.1'::inet
FROM users u
CROSS JOIN (VALUES 
    ('user.created'),
    ('user.login'),
    ('profile.updated')
) AS actions(action_type)
WHERE u.email IN ('john.doe@example.com', 'jane.smith@example.com')
LIMIT 10;

-- 통계 정보 출력
DO $$
DECLARE
    user_count INTEGER;
    product_count INTEGER;
    profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO product_count FROM products;
    SELECT COUNT(*) INTO profile_count FROM user_profiles;
    
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Seed data loaded successfully!';
    RAISE NOTICE '- Users: %', user_count;
    RAISE NOTICE '- Products: %', product_count;
    RAISE NOTICE '- User Profiles: %', profile_count;
    RAISE NOTICE '=============================================================================';
END $$;