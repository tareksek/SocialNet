// server.js - نسخة HTML صافي 100% + أمان عالي + دعم Cloudinary v2
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('@fluidjs/multer-cloudinary'); // التغيير الوحيد هنا
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = 3000;

// ==================== قاعدة البيانات ====================
const adapter = new JSONFile('database.json');
const db = new Low(adapter);
await db.read();
db.data ||= { users: [], posts: [], comments: [], likes: [] };
await db.write();

// ==================== الأمان ====================
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // كل الـ HTML والـ CSS والـ JS من مجلد public

// الجلسات الآمنة
app.use(session({
  store: new FileStore({ path: './sessions' }),
  secret: process.env.SESSION_SECRET || 'change-this-in-production-123456',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    httpOnly: true, 
    secure: false, // غيرها لـ true في الإنتاج مع HTTPS
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 
  }
}));

// Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: { 
    folder: 'minibook', 
    allowed_formats: ['jpg','png','jpeg','gif','webp'] 
  }
});
const upload = multer({ storage });

// Middleware: إرفاق المستخدم في كل طلب
const attachUser = async (req, res, next) => {
  if (req.session.userId) {
    await db.read();
    req.user = db.data.users.find(u => u.id === req.session.userId);
  }
  next();
};
app.use(attachUser);

// صفحات HTML
app.get('/', (req, res) => {
  if (!req.user) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login.html', (req, res) => {
  if (req.user) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register.html', (req, res) => {
  if (req.user) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// ==================== APIs (تستخدمها الـ JavaScript في الواجهة) ====================

// تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
  const { fullName, email, password } = req.body;
  await db.read();

  if (db.data.users.some(u => u.email === email)) {
    return res.json({ success: false, message: "البريد مسجل مسبقًا" });
  }

  const hashed = await bcrypt.hash(password, 12);
  const newUser = {
    id: uuidv4(),
    fullName,
    email,
    password: hashed,
    avatar: "https://res.cloudinary.com/dw0asfxtg/image/upload/v1738812345/default-avatar.png", // ضع رابط صورة افتراضية
    createdAt: Date.now()
  };

  db.data.users.push(newUser);
  await db.write();

  req.session.userId = newUser.id;
  res.json({ success: true, redirect: '/' });
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  await db.read();

  const user = db.data.users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.json({ success: false, message: "بيانات الدخول غير صحيحة" });
  }

  req.session.userId = user.id;
  res.json({ success: true, redirect: '/' });
});

// تسجيل الخروج
app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true, redirect: '/login.html' });
});

// جلب المنشورات (يستخدم في index.html)
app.get('/api/posts', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "غير مسجل دخول" });

  await db.read();
  const posts = db.data.posts
    .map(post => {
      const author = db.data.users.find(u => u.id === post.authorId) || { fullName: "محذوف", avatar: "/images/default.png" };
      return {
        ...post,
        authorName: author.fullName,
        authorAvatar: author.avatar,
        likesCount: db.data.likes.filter(l => l.postId === post.id).length,
        isLiked: db.data.likes.some(l => l.postId === post.id && l.userId === req.user.id)
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  res.json(posts);
});

// إنشاء منشور جديد
app.post('/api/post', upload.single('image'), async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "غير مسجل" });

  const { content } = req.body;
  if (!content.trim() && !req.file) return res.redirect('/');

  const newPost = {
    id: uuidv4(),
    authorId: req.user.id,
    content: content.trim(),
    image: req.file ? req.file.path : null,
    createdAt: Date.now()
  };

  await db.read();
  db.data.posts.push(newPost);
  await db.write();

  res.json({ success: true, post: newPost });
});

app.listen(PORT, () => {
  console.log(`MiniBook يعمل الآن على http://localhost:${PORT}`);
  console.log(`افتح المتصفح وجرب: http://localhost:3000/login.html`);
});
