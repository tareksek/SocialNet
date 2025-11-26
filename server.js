const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// قاعدة البيانات (استبدل بـDB_URL في Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgres://\( {DB_USER}: \){DB_PASSWORD}@\( {DB_HOST}: \){DB_PORT}/${DB_NAME}`,
});
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // للواجهة

// SQL لإنشاء جدول (شغله مرة واحدة)
const createTable = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

// إنشاء الجدول عند التشغيل
pool.query(createTable);

// API: تسجيل مستخدم
app.post('/api/register', async (req, res) => {
  const { username, email, bio } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (username, email, bio) VALUES ($1, $2, $3) RETURNING *',
      [username, email, bio]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// API: جلب الملف الشخصي
app.get('/api/profile/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    res.json(result.rows[0] || { error: 'غير موجود' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: تغذية بسيطة (قائمة مستخدمين)
app.get('/api/feed', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`الخادم يعمل على http://localhost:${PORT}`));
