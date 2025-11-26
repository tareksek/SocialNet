
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken'); // npm install jsonwebtoken

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'database.json');
const SECRET = 'your_secret_key'; // غيرها

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { users: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// تسجيل مع password
app.post('/api/register', (req, res) => {
  const { username, email, bio, password } = req.body;
  const db = readDB();
  if (db.users.find(u => u.username === username || u.email === email)) {
    return res.status(400).json({ error: 'مستخدم موجود' });
  }
  const newUser = {
    id: Date.now(),
    username,
    email,
    bio,
    password, // غير مشفر
    created_at: new Date().toISOString()
  };
  db.users.push(newUser);
  writeDB(db);
  res.json(newUser);
});

// تسجيل دخول
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'بيانات خاطئة' });
  }
  const token = jwt.sign({ id: user.id }, SECRET);
  res.json({ token, user: { id: user.id, username: user.username } });
});

// middleware للتحقق (اختياري لـAPI محمية)
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'غير مصرح' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'توكن غير صالح' });
  }
}

// مثال: profile محمي
app.get('/api/profile/:id', auth, (req, res) => {
  if (req.user.id != req.params.id) return res.status(403).json({ error: 'غير مصرح' });
  const db = readDB();
  const user = db.users.find(u => u.id == req.params.id);
  res.json(user || { error: 'غير موجود' });
});

app.get('/api/feed', (req, res) => {
  const db = readDB();
  res.json(db.users.slice(-10).reverse());
});

app.listen(PORT, () => console.log(`الخادم يعمل على http://localhost:${PORT}`));
