
-- ============================================
-- USER MANAGEMENT TABLES
-- ============================================

-- Users table (for customers)
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(100),
    profile_picture_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_phone (phone_number),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- Shop owners table
CREATE TABLE shop_owners (
    owner_id VARCHAR(50) PRIMARY KEY,
    business_name VARCHAR(200) NOT NULL,
    owner_name VARCHAR(100),
    phone_number VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(100),
    profile_picture_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_phone (phone_number),
    INDEX idx_business_name (business_name),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ============================================
-- SHOP MANAGEMENT TABLES
-- ============================================

-- Categories table
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    category_color VARCHAR(7) NOT NULL,
    icon_emoji VARCHAR(10),
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (category_name)
) ENGINE=InnoDB;

-- Insert default categories
INSERT INTO categories (category_name, category_color, icon_emoji, display_order) VALUES
('Grocery', '#4CAF50', '🛒', 1),
('Electronics', '#FF9800', '📱', 2),
('Pharmacy', '#E91E63', '💊', 3),
('Clothing', '#2196F3', '👕', 4),
('General', '#FFC107', '🏪', 5);

-- Shops table
CREATE TABLE shops (
    shop_id VARCHAR(50) PRIMARY KEY,
    owner_id VARCHAR(50) NOT NULL,
    shop_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Location details
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    formatted_address VARCHAR(500),
    street_address VARCHAR(200),
    locality VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    postal_code VARCHAR(10),
    plus_code VARCHAR(20),
    
    -- Visibility settings
    visibility_radius_km INT DEFAULT 5,
    is_visible BOOLEAN DEFAULT TRUE,
    is_online BOOLEAN DEFAULT TRUE,
    
    -- Stats
    total_views INT DEFAULT 0,
    total_chats INT DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_ratings INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (owner_id) REFERENCES shop_owners(owner_id) ON DELETE CASCADE,
    INDEX idx_owner (owner_id),
    INDEX idx_location (latitude, longitude),
    INDEX idx_city (city),
    INDEX idx_visibility (is_visible, is_online),
    INDEX idx_rating (average_rating)
) ENGINE=InnoDB;

-- Shop categories (many-to-many relationship)
CREATE TABLE shop_categories (
    shop_category_id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id VARCHAR(50) NOT NULL,
    category_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE,
    UNIQUE KEY unique_shop_category (shop_id, category_id),
    INDEX idx_shop (shop_id),
    INDEX idx_category (category_id)
) ENGINE=InnoDB;

-- Shop photos
CREATE TABLE shop_photos (
    photo_id VARCHAR(50) PRIMARY KEY,
    shop_id VARCHAR(50) NOT NULL,
    photo_url VARCHAR(500) NOT NULL,
    photo_order INT DEFAULT 0,
    file_name VARCHAR(200),
    file_size INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE,
    INDEX idx_shop (shop_id),
    INDEX idx_order (shop_id, photo_order)
) ENGINE=InnoDB;

-- Shop operating hours
CREATE TABLE shop_hours (
    hours_id INT AUTO_INCREMENT PRIMARY KEY,
    shop_id VARCHAR(50) NOT NULL,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    opening_time TIME,
    closing_time TIME,
    is_closed BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE,
    UNIQUE KEY unique_shop_day (shop_id, day_of_week),
    INDEX idx_shop (shop_id)
) ENGINE=InnoDB;

-- ============================================
-- CHAT & MESSAGING TABLES
-- ============================================

-- Conversations table
CREATE TABLE conversations (
    conversation_id VARCHAR(50) PRIMARY KEY,
    shop_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    last_message TEXT,
    last_message_time TIMESTAMP NULL,
    last_message_by ENUM('shop', 'customer') NULL,
    unread_count_shop INT DEFAULT 0,
    unread_count_customer INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_shop_user (shop_id, user_id),
    INDEX idx_shop (shop_id),
    INDEX idx_user (user_id),
    INDEX idx_updated (updated_at)
) ENGINE=InnoDB;

-- Messages table
CREATE TABLE messages (
    message_id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL,
    sender_type ENUM('shop', 'customer') NOT NULL,
    sender_id VARCHAR(50) NOT NULL,
    message_text TEXT NOT NULL,
    attachment_url VARCHAR(500),
    attachment_type ENUM('image', 'document', 'link') NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id),
    INDEX idx_created (created_at),
    INDEX idx_unread (conversation_id, is_read)
) ENGINE=InnoDB;

-- ============================================
-- RATINGS & REVIEWS TABLES
-- ============================================

-- Ratings table
CREATE TABLE ratings (
    rating_id VARCHAR(50) PRIMARY KEY,
    shop_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    rating_value INT NOT NULL CHECK (rating_value BETWEEN 1 AND 5),
    review_comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_shop_rating (user_id, shop_id),
    INDEX idx_shop (shop_id),
    INDEX idx_user (user_id),
    INDEX idx_rating (rating_value),
    INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ============================================
-- ACTIVITY & ANALYTICS TABLES
-- ============================================

-- Shop views tracking
CREATE TABLE shop_views (
    view_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    shop_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50),
    view_date DATE NOT NULL,
    view_count INT DEFAULT 1,
    FOREIGN KEY (shop_id) REFERENCES shops(shop_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    UNIQUE KEY unique_shop_user_date (shop_id, user_id, view_date),
    INDEX idx_shop_date (shop_id, view_date),
    INDEX idx_date (view_date)
) ENGINE=InnoDB;

-- User locations (for proximity search)
CREATE TABLE user_locations (
    location_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_location (latitude, longitude),
    INDEX idx_recorded (recorded_at)
) ENGINE=InnoDB;

-- Notification preferences
CREATE TABLE notification_settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id VARCHAR(50) NOT NULL,
    instant_notifications BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT FALSE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    new_chat_notifications BOOLEAN DEFAULT TRUE,
    new_rating_notifications BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES shop_owners(owner_id) ON DELETE CASCADE,
    UNIQUE KEY unique_owner_settings (owner_id)
) ENGINE=InnoDB;

-- ============================================
-- USEFUL VIEWS FOR QUERIES
-- ============================================

-- View for shop details with categories
CREATE VIEW v_shop_details AS
SELECT 
    s.shop_id,
    s.owner_id,
    so.business_name AS owner_business_name,
    so.phone_number AS owner_phone,
    s.shop_name,
    s.description,
    s.latitude,
    s.longitude,
    s.formatted_address,
    s.city,
    s.state,
    s.visibility_radius_km,
    s.is_visible,
    s.is_online,
    s.total_views,
    s.total_chats,
    s.average_rating,
    s.total_ratings,
    GROUP_CONCAT(c.category_name SEPARATOR ', ') AS categories,
    s.created_at,
    s.updated_at
FROM shops s
JOIN shop_owners so ON s.owner_id = so.owner_id
LEFT JOIN shop_categories sc ON s.shop_id = sc.shop_id
LEFT JOIN categories c ON sc.category_id = c.category_id
GROUP BY s.shop_id;

-- View for recent conversations
CREATE VIEW v_recent_conversations AS
SELECT 
    c.conversation_id,
    c.shop_id,
    s.shop_name,
    c.user_id,
    u.full_name AS customer_name,
    c.last_message,
    c.last_message_time,
    c.last_message_by,
    c.unread_count_shop,
    c.unread_count_customer,
    c.updated_at
FROM conversations c
JOIN shops s ON c.shop_id = s.shop_id
JOIN users u ON c.user_id = u.user_id
WHERE c.is_active = TRUE
ORDER BY c.updated_at DESC;

-- View for shop ratings summary
CREATE VIEW v_shop_ratings AS
SELECT 
    r.shop_id,
    s.shop_name,
    COUNT(r.rating_id) AS total_ratings,
    AVG(r.rating_value) AS average_rating,
    SUM(CASE WHEN r.rating_value = 5 THEN 1 ELSE 0 END) AS five_star_count,
    SUM(CASE WHEN r.rating_value = 4 THEN 1 ELSE 0 END) AS four_star_count,
    SUM(CASE WHEN r.rating_value = 3 THEN 1 ELSE 0 END) AS three_star_count,
    SUM(CASE WHEN r.rating_value = 2 THEN 1 ELSE 0 END) AS two_star_count,
    SUM(CASE WHEN r.rating_value = 1 THEN 1 ELSE 0 END) AS one_star_count
FROM ratings r
JOIN shops s ON r.shop_id = s.shop_id
GROUP BY r.shop_id, s.shop_name;

-- ============================================
-- STORED PROCEDURES
-- ============================================

DELIMITER //

-- Procedure to calculate distance between two coordinates (Haversine formula)
CREATE PROCEDURE sp_get_nearby_shops(
    IN p_latitude DECIMAL(10, 8),
    IN p_longitude DECIMAL(11, 8),
    IN p_radius_km INT,
    IN p_category VARCHAR(50)
)
BEGIN
    SELECT 
        s.shop_id,
        s.shop_name,
        s.description,
        s.latitude,
        s.longitude,
        s.formatted_address,
        s.is_online,
        s.average_rating,
        s.total_ratings,
        (
            6371 * ACOS(
                COS(RADIANS(p_latitude)) * 
                COS(RADIANS(s.latitude)) * 
                COS(RADIANS(s.longitude) - RADIANS(p_longitude)) + 
                SIN(RADIANS(p_latitude)) * 
                SIN(RADIANS(s.latitude))
            )
        ) AS distance_km,
        GROUP_CONCAT(c.category_name SEPARATOR ', ') AS categories
    FROM shops s
    LEFT JOIN shop_categories sc ON s.shop_id = sc.shop_id
    LEFT JOIN categories c ON sc.category_id = c.category_id
    WHERE 
        s.is_visible = TRUE
        AND s.is_online = TRUE
        AND (
            6371 * ACOS(
                COS(RADIANS(p_latitude)) * 
                COS(RADIANS(s.latitude)) * 
                COS(RADIANS(s.longitude) - RADIANS(p_longitude)) + 
                SIN(RADIANS(p_latitude)) * 
                SIN(RADIANS(s.latitude))
            )
        ) <= LEAST(p_radius_km, s.visibility_radius_km)
        AND (p_category IS NULL OR p_category = 'All' OR c.category_name = p_category)
    GROUP BY s.shop_id
    ORDER BY distance_km ASC;
END //

-- Procedure to update shop rating
CREATE PROCEDURE sp_update_shop_rating(
    IN p_shop_id VARCHAR(50)
)
BEGIN
    UPDATE shops
    SET 
        average_rating = (
            SELECT COALESCE(AVG(rating_value), 0)
            FROM ratings
            WHERE shop_id = p_shop_id
        ),
        total_ratings = (
            SELECT COUNT(*)
            FROM ratings
            WHERE shop_id = p_shop_id
        )
    WHERE shop_id = p_shop_id;
END //

-- Procedure to mark messages as read
CREATE PROCEDURE sp_mark_messages_read(
    IN p_conversation_id VARCHAR(50),
    IN p_reader_type ENUM('shop', 'customer')
)
BEGIN
    -- Mark messages as read
    UPDATE messages
    SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
    WHERE conversation_id = p_conversation_id
        AND sender_type != p_reader_type
        AND is_read = FALSE;
    
    -- Update unread count in conversation
    IF p_reader_type = 'shop' THEN
        UPDATE conversations
        SET unread_count_shop = 0
        WHERE conversation_id = p_conversation_id;
    ELSE
        UPDATE conversations
        SET unread_count_customer = 0
        WHERE conversation_id = p_conversation_id;
    END IF;
END //

DELIMITER ;

-- ============================================
-- TRIGGERS
-- ============================================

DELIMITER //

-- Trigger to update shop total_chats when new conversation is created
CREATE TRIGGER tr_conversation_insert
AFTER INSERT ON conversations
FOR EACH ROW
BEGIN
    UPDATE shops
    SET total_chats = total_chats + 1
    WHERE shop_id = NEW.shop_id;
END //

-- Trigger to update conversation after new message
CREATE TRIGGER tr_message_insert
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
    UPDATE conversations
    SET 
        last_message = NEW.message_text,
        last_message_time = NEW.created_at,
        last_message_by = NEW.sender_type,
        unread_count_shop = CASE 
            WHEN NEW.sender_type = 'customer' THEN unread_count_shop + 1 
            ELSE unread_count_shop 
        END,
        unread_count_customer = CASE 
            WHEN NEW.sender_type = 'shop' THEN unread_count_customer + 1 
            ELSE unread_count_customer 
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE conversation_id = NEW.conversation_id;
END //

-- Trigger to update shop rating after new rating
CREATE TRIGGER tr_rating_insert
AFTER INSERT ON ratings
FOR EACH ROW
BEGIN
    CALL sp_update_shop_rating(NEW.shop_id);
END //

CREATE TRIGGER tr_rating_update
AFTER UPDATE ON ratings
FOR EACH ROW
BEGIN
    CALL sp_update_shop_rating(NEW.shop_id);
END //

CREATE TRIGGER tr_rating_delete
AFTER DELETE ON ratings
FOR EACH ROW
BEGIN
    CALL sp_update_shop_rating(OLD.shop_id);
END //

DELIMITER ;

-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================

-- Insert sample users
INSERT INTO users (user_id, full_name, phone_number) VALUES
('user_001', 'Rajesh Kumar', '9876543210'),
('user_002', 'Priya Sharma', '9876543211'),
('user_003', 'Amit Patel', '9876543212');

-- Insert sample shop owners
INSERT INTO shop_owners (owner_id, business_name, owner_name, phone_number) VALUES
('owner_001', 'Kumar General Store', 'Suresh Kumar', '9123456780'),
('owner_002', 'Sharma Electronics', 'Ramesh Sharma', '9123456781'),
('owner_003', 'City Pharmacy', 'Dr. Anil Verma', '9123456782');

-- Insert sample shops
INSERT INTO shops (shop_id, owner_id, shop_name, description, latitude, longitude, formatted_address, city, state, visibility_radius_km) VALUES
('shop_001', 'owner_001', 'Kumar General Store', 'Quality groceries at affordable prices', 22.7196, 75.8577, '123 Main Street, Indore, MP', 'Indore', 'Madhya Pradesh', 5),
('shop_002', 'owner_002', 'Sharma Electronics', 'Latest electronics and gadgets', 22.7206, 75.8587, '456 Market Road, Indore, MP', 'Indore', 'Madhya Pradesh', 3),
('shop_003', 'owner_003', 'City Pharmacy', '24/7 medical supplies', 22.7186, 75.8567, '789 Health Lane, Indore, MP', 'Indore', 'Madhya Pradesh', 7);

-- Link shops to categories
INSERT INTO shop_categories (shop_id, category_id) VALUES
('shop_001', 1), -- Grocery
('shop_001', 5), -- General
('shop_002', 2), -- Electronics
('shop_003', 3); -- Pharmacy

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Additional composite indexes for common queries
CREATE INDEX idx_shops_visible_online_location ON shops(is_visible, is_online, latitude, longitude);
CREATE INDEX idx_conversations_shop_updated ON conversations(shop_id, updated_at);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX idx_ratings_shop_created ON ratings(shop_id, created_at);
