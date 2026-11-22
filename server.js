const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ฟังก์ชันเตรียมข้อมูลเริ่มต้น
async function initDatabase() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key VARCHAR(50) PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      emoji VARCHAR(20) DEFAULT '📁'
    );
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
  `);

  const passRes = await db.query("SELECT value FROM app_settings WHERE key = 'app_password'");
  if (passRes.rows.length > 0 && await bcrypt.compare('1234', passRes.rows[0].value)) {
    await db.query("DELETE FROM app_settings WHERE key = 'app_password' AND value = $1", [passRes.rows[0].value]);
  }

  if (process.env.APP_PASSWORD) {
    const currentPassRes = await db.query("SELECT 1 FROM app_settings WHERE key = 'app_password'");
    if (currentPassRes.rows.length === 0) {
      const hash = await bcrypt.hash(process.env.APP_PASSWORD, 10);
      await db.query(
        "INSERT INTO app_settings (key, value) VALUES ('app_password', $1) ON CONFLICT (key) DO NOTHING",
        [hash]
      );
    }
  }
}

// --- 1. APIs: ตรวจสอบและตั้งค่าความปลอดภัย ---
app.get('/api/auth-status', async (req, res) => {
  try {
    const result = await db.query("SELECT 1 FROM app_settings WHERE key = 'app_password'");
    res.json({ passwordSet: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/setup-password', async (req, res) => {
  const { password } = req.body;
  if (typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ success: false, message: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO app_settings (key, value)
       SELECT 'app_password', $1
       WHERE NOT EXISTS (SELECT 1 FROM app_settings WHERE key = 'app_password')
       ON CONFLICT (key) DO NOTHING`,
      [hash]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ success: false, message: 'ตั้งรหัสผ่านไว้แล้ว กรุณาเข้าสู่ระบบ' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, message: 'กรุณากรอกรหัสผ่าน' });

  try {
    const r = await db.query("SELECT value FROM app_settings WHERE key = 'app_password'");
    if (r.rows.length === 0) return res.status(500).json({ success: false, message: 'ไม่พบรหัสผ่าน' });

    const match = await bcrypt.compare(password, r.rows[0].value);
    if (match) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/security-status', async (req, res) => {
  try {
    const qRes = await db.query("SELECT value FROM app_settings WHERE key = 'security_question'");
    const isConfigured = qRes.rows.length > 0 && qRes.rows[0].value.trim() !== '';
    res.json({ isConfigured });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/setup-security-question', async (req, res) => {
  const { question, answer } = req.body;
  if (!question || !answer) return res.status(400).json({ message: 'กรุณาระบุคำถามและคำตอบ' });

  try {
    const norm = answer.toLowerCase().replace(/\\s+/g, '');
    const hash = await bcrypt.hash(norm, 10);

    await db.query(`
      INSERT INTO app_settings (key, value) VALUES ('security_question', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [question.trim()]);

    await db.query(`
      INSERT INTO app_settings (key, value) VALUES ('security_answer_hash', $1)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [hash]);

    res.json({ success: true, message: 'บันทึกคำถามความปลอดภัยสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/security-question', async (req, res) => {
  try {
    const r = await db.query("SELECT value FROM app_settings WHERE key = 'security_question'");
    if (r.rows.length === 0) return res.status(404).json({ message: 'ยังไม่ได้ตั้งคำถามความปลอดภัย' });
    res.json({ question: r.rows[0].value });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/recover-by-question', async (req, res) => {
  const { answer, newPassword } = req.body;
  if (!answer) return res.status(400).json({ message: 'กรุณากรอกคำตอบ' });

  try {
    const aRes = await db.query("SELECT value FROM app_settings WHERE key = 'security_answer_hash'");
    if (aRes.rows.length === 0) return res.status(400).json({ message: 'ยังไม่ได้ตั้งค่าความปลอดภัย' });

    const norm = answer.toLowerCase().replace(/\\s+/g, '');
    const isMatch = await bcrypt.compare(norm, aRes.rows[0].value);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'คำตอบไม่ถูกต้อง' });
    }

    if (newPassword && newPassword.trim().length >= 4) {
      const passHash = await bcrypt.hash(newPassword.trim(), 10);
      await db.query("UPDATE app_settings SET value = $1 WHERE key = 'app_password'", [passHash]);
    }

    res.json({ success: true, message: 'ยืนยันตัวตนสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });

  try {
    const r = await db.query("SELECT value FROM app_settings WHERE key = 'app_password'");
    const isMatch = await bcrypt.compare(currentPassword, r.rows[0].value);
    if (!isMatch) return res.status(401).json({ success: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });

    const hash = await bcrypt.hash(newPassword.trim(), 10);
    await db.query("UPDATE app_settings SET value = $1 WHERE key = 'app_password'", [hash]);
    res.json({ success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 2. APIs: หมวดหมู่กิจกรรม ---
app.get('/api/categories', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  const { name, emoji } = req.body;
  if (!name) return res.status(400).json({ message: 'กรุณาระบุชื่อหมวดหมู่' });

  try {
    const result = await db.query(
      'INSERT INTO categories (name, emoji) VALUES ($1, $2) RETURNING *',
      [name.trim(), emoji || '📁']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 3. APIs: โพสต์กิจกรรมแผนงาน ---
app.get('/api/posts', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM posts ORDER BY sort_order ASC, created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts', async (req, res) => {
  const { title, event_date, content, category_id, image_data, doc_data, doc_name } = req.body;
  if (!title || !event_date) return res.status(400).json({ message: 'กรุณากรอกหัวข้อและวันที่' });

  try {
    await db.query('UPDATE posts SET sort_order = sort_order + 1');
    const result = await db.query(
      `INSERT INTO posts (title, event_date, content, category_id, sort_order, is_completed, is_collapsed, image_data, doc_data, doc_name)
       VALUES ($1, $2, $3, $4, 1, false, false, $5, $6, $7) RETURNING *`,
      [title.trim(), event_date, content ? content.trim() : '', category_id || null, image_data || null, doc_data || null, doc_name || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { title, event_date, content, category_id } = req.body;

  try {
    const result = await db.query(
      `UPDATE posts SET title = $1, event_date = $2, content = $3, category_id = $4 WHERE id = $5 RETURNING *`,
      [title.trim(), event_date, content ? content.trim() : '', category_id || null, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/posts/:id/toggle-complete', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE posts SET is_completed = NOT is_completed WHERE id = $1 RETURNING *',
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/posts/:id/toggle-collapse', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE posts SET is_collapsed = NOT is_collapsed WHERE id = $1 RETURNING *',
      [id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/posts/reorder', async (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง' });

  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.query('UPDATE posts SET sort_order = $1 WHERE id = $2', [i + 1, orderedIds[i]]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM posts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function startServer() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Database initialization error:', err);
  process.exitCode = 1;
});