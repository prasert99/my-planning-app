-- 1. ตารางการตั้งค่าระบบ (สำหรับเก็บรหัสผ่านและคำถาม-คำตอบความปลอดภัย)
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL
);

-- 2. ตารางหมวดหมู่กิจกรรม
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(20) DEFAULT '📁'
);

-- 3. ตารางโพสต์แผนงานกิจกรรม
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    content TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    sort_order INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    is_collapsed BOOLEAN DEFAULT FALSE,
    image_data TEXT,
    doc_data TEXT,
    doc_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
