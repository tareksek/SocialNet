
// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// استخدام مسارات المصادقة
app.use('/api/auth', authRoutes);

// خدمة الصفحات الثابتة
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
app.get('/feed', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'feed.html'));
});

// API: جلب المشاركات (نحتفظ به كما هو)
app.get('/api/posts', (req, res) => {
  const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'database.json'), 'utf8'));
  const posts = [];
  db.users.forEach(u => {
    u.posts.forEach(p => {
      posts.push({
        id: p.id,
        userId: p.userId,
        username: u.username,
        content: p.content,
        timestamp: p.timestamp
      });
    });
  });
  posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(posts);
});

// API: نشر منشور (نحتفظ به — لكن نضيف auth لاحقًا)
app.use('/api/posts', (req, res, next) => {
  // هنا يمكن إضافة middleware للتحقق من الجلسة لاحقًا
  next();
});

app.post('/api/posts', (req, res) => {
  // نفس الكود القديم (نختصره هنا)
  const { userId, content } = req.body;
  const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'database.json'), 'utf8'));
  const user = db.users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'مستخدم غير موجود' });
  const post = {
    id: user.posts.length ? Math.max(...user.posts.map(p => p.id)) + 1 : 1,
    userId,
    content: require('./utils/security').sanitizeInput(content),
    timestamp: new Date().toISOString()
  };
  user.posts.push(post);
  fs.writeFileSync(path.join(__dirname, 'database.json'), JSON.stringify(db, null, 2));
  res.status(201).json(post);
});

app.listen(PORT, () => {
  console.log(`✅ يعمل على http://localhost:${PORT}`);
});
