// server.js - نسخة نهائية شغالة 100% على Render نوفمبر 2025
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// إعداد Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

// إعداد lowdb داخل دالة async
async function initDb() {
  const adapter = new JSONFile('database.json');
  const db = new Low(adapter);
  await db.read();
  db.data ||= { users: [], posts: [], comments: [], likes: [] };
  await db.write();
  return db;
}

// رفع الصورة إلى Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'minibook', allowed_formats: ['jpg','png','jpeg','gif','webp'] },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    ).end(buffer);
  });
};

// التشغيل الرئيسي
(async () => {
  const db = await initDb();

  // Middleware
  app.use(helmet());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static('public'));

  app.use(session({
    store: new FileStore({ path: './sessions', retries: 2 }),
    secret: process.env.SESSION_SECRET || 'mini-book-very-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  }));

  // جلب المستخدم من الجلسة
  app.use(async (req, res, next) => {
    if (req.session.userId) {
      await db.read();
      req.user = db.data.users.find(u => u.id === req.session.userId);
    }
    next();
  });

  // Routes
  app.get('/', (req, res) => {
    if (!req.user) return res.redirect('/login.html');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.get('/login.html', (req, res) => req.user ? res.redirect('/') : res.sendFile(path.join(__dirname, 'public', 'login.html')));
  app.get('/register.html', (req, res) => req.user ? res.redirect('/') : res.sendFile(path.join(__dirname, 'public', 'register.html')));

  // API Routes
  app.post('/api/register', async (req, res) => {
    const { fullName, email, password } = req.body;
    await db.read();
    if (db.data.users.some(u => u.email === email)) {
      return res.json({ success: false, message: "البريد مسجل مسبقاً" });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = {
      id: uuidv4(),
      fullName,
      email,
      password: hashed,
      avatar: '/images/default-avatar.png',
      createdAt: Date.now()
    };
    db.data.users.push(user);
    await db.write();
    req.session.userId = user.id;
    res.json({ success: true, redirect: '/' });
  });

  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    await db.read();
    const user = db.data.users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.json({ success: false, message: "بيانات غير صحيحة" });
    }
    req.session.userId = user.id;
    res.json({ success: true, redirect: '/' });
  });

  app.get('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, redirect: '/login.html' });
  });

  app.get('/api/posts', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'غير مسجل' });
    await db.read();
    const posts = db.data.posts.map(p => {
      const author = db.data.users.find(u => u.id === p.authorId) || { fullName: 'محذوف', avatar: '/images/default-avatar.png' };
      return {
        ...p,
        authorName: author.fullName,
        authorAvatar: author.avatar,
        likesCount: db.data.likes.filter(l => l.postId === p.id).length,
        isLiked: db.data.likes.some(l => l.postId === p.id && l.userId === req.user.id)
      };
    }).sort((a, b) => b.createdAt - a.createdAt);
    res.json(posts);
  });

  app.post('/api/post', upload.single('image'), async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'غير مسجل' });

    let imageUrl = null;
    if (req.file) {
      try {
        imageUrl = await uploadToCloudinary(req.file.buffer);
      } catch (err) {
        console.error("خطأ في رفع الصورة:", err);
        return res.status(500).json({ error: 'فشل رفع الصورة' });
      }
    }

    const { content } = req.body;
    if (!content?.trim() && !imageUrl) return res.status(400).json({ error: 'المنشور فارغ' });

    const post = {
      id: uuidv4(),
      authorId: req.user.id,
      content: content?.trim() || '',
      image: imageUrl,
      createdAt: Date.now()
    };

    await db.read();
    db.data.posts.push(post);
    await db.write();
    res.json({ success: true, post });
  });

  // بدء السيرفر
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MiniBook يعمل الآن على المنفذ ${PORT}`);
  });
})();
