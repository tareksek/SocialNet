
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// وظائف قاعدة البيانات البسيطة
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { users: [] }; // إذا غير موجود، أنشئ فارغ
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// إنشاء جدول افتراضي (مرة واحدة)
const initialDB = readDB();
if (initialDB.users.length === 0) {
  writeDB({ users: [] });
}

// API: تسجيل مستخدم
app.post('/api/register', (req, res) => {
  const { username, email, bio } = req.body;
  const db = readDB();
  if (db.users.find(u => u.username === username || u.email === email)) {
    return res.status(400).json({ error: 'مستخدم موجود' });
  }
  const newUser = {
    id: Date.now(), // ID بسيط
    username,
    email,
    bio,
    created_at: new Date().toISOString()
  };
  db.users.push(newUser);
  writeDB(db);
  res.json(newUser);
});

// API: جلب الملف الشخصي
app.get('/api/profile/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const user = db.users.find(u => u.id == id);
  if (!user) return res.status(404).json({ error: 'غير موجود' });
  res.json(user);
});

// API: تغذية (قائمة مستخدمين)
app.get('/api/feed', (req, res) => {
  const db = readDB();
  const feed = db.users.slice(-10).reverse(); // آخر 10
  res.json(feed);
});

app.listen(PORT, () => console.log(`الخادم يعمل على http://localhost:${PORT}`));
