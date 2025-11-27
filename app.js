
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = 'super-secret-key-2025';

app.use(cors());
app.use(bodyParser.json());

// خدمة الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// إنشاء db.json إذا غير موجود
if (!fs.existsSync('db.json')) {
  fs.writeFileSync('db.json', JSON.stringify({ users: [], posts: [], comments: [] }));
}

const loadDB = () => JSON.parse(fs.readFileSync('db.json', 'utf8'));
const saveDB = (db) => fs.writeFileSync('db.json', JSON.stringify(db, null, 2));

// Register
app.post('/register', (req, res) => {
  const db = loadDB();
  const { username, password } = req.body;
  if (db.users.find(u => u.username === username)) return res.status(400).json({ msg: 'المستخدم موجود' });

  const hashed = bcrypt.hashSync(password, 8);
  const newUser = { id: Date.now(), username, password: hashed };
  db.users.push(newUser);
  saveDB(db);
  res.json({ msg: 'تم التسجيل بنجاح' });
});

// Login
app.post('/login', (req, res) => {
  const db = loadDB();
  const { username, password } = req.body;
  const user = db.users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ msg: 'بيانات خاطئة' });
  }
  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '24h' });
  res.json({ token });
});

// Middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'لا يوجد توكن' });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'توكن غير صالح' });
  }
};

// Get all posts
app.get('/posts', auth, (req, res) => {
  const db = loadDB();
  const postsWithComments = db.posts.map(post => ({
    ...post,
    comments: db.comments.filter(c => c.postId === post.id)
  })).reverse();
  res.json(postsWithComments);
});

// Create post
app.post('/posts', auth, (req, res) => {
  const db = loadDB();
  const { content } = req.body;
  const post = {
    id: Date.now(),
    userId: req.userId,
    content,
    likes: 0,
    timestamp: new Date().toISOString()
  };
  db.posts.push(post);
  saveDB(db);
  res.json(post);
});

// Like
app.post('/posts/:id/like', auth, (req, res) => {
  const db = loadDB();
  const post = db.posts.find(p => p.id == req.params.id);
  if (!post) return res.status(404).json({ msg: 'المنشور غير موجود' });
  post.likes++;
  saveDB(db);
  res.json({ likes: post.likes });
});

// Comment
app.post('/posts/:id/comment', auth, (req, res) => {
  const db = loadDB();
  const post = db.posts.find(p => p.id == req.params.id);
  if (!post) return res.status(404).json({ msg: 'المنشور غير موجود' });

  const { content } = req.body;
  const comment = {
    id: Date.now(),
    postId: post.id,
    userId: req.userId,
    content,
    timestamp: new Date().toISOString()
  };
  db.comments.push(comment);
  saveDB(db);
  res.json(comment);
});

// لأي طلب غير معروف → أرجع index.html (مهم للـ SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on https://social-app.onrender.com`);
});
