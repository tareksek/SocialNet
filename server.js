// server.js - النسخة النهائية الشغالة على Render نوفمبر 2025
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const path = require('path');
const fetch = require('node-fetch'); // مهم جدًا → أضفناه

const app = express();
const PORT = process.env.PORT || 3000;

// JSONBin.io (قاعدة بيانات مجانية على الإنترنت)
const BIN_ID = process.env.JSONBIN_ID || '676f1f79acd3cb34a9ff1b3b'; // استخدم هذا المعرف أو أنشئ واحد خاص بك
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${BIN_ID}/latest`;
const JSONBIN_SECRET = process.env.JSONBIN_SECRET || '$2a$10$0z8Q8z8Q8z8Q8z8Q8z8Q8u12345678901234567890'; // ضع سر قوي في Render

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

// جلب وقراءة وكتابة البيانات من JSONBin
async function getData() {
  const res = await fetch(JSONBIN_URL, {
    headers: { 'X-Master-Key': JSONBIN_SECRET }
  });
  if (!res.ok) return { users: [], posts: [], comments: [], likes: [] };
  const json = await res.json();
  return json.record || { users: [], posts: [], comments: [], likes: [] };
}

async function saveData(data) {
  await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_SECRET
    },
    body: JSON.stringify(data)
  });
}

// رفع الصورة
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'minibook' },
      (error, result) => error ? reject(error) : resolve(result.secure_url)
    ).end(buffer);
  });
};

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  store: new FileStore({ path: './sessions' }),
  secret: process.env.SESSION_SECRET || 'mini-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7*24*60*60*1000 }
}));

app.use(async (req, res, next) => {
  req.db = await getData();
  if (req.session.userId) {
    req.user = req.db.users.find(u => u.id === req.session.userId);
  }
  next();
});

// Routes + API (نفس السابق مع تعديل بسيط لاستخدام req.db)
app.get('/', (req, res) => req.user ? res.sendFile(path.join(__dirname, 'public', 'index.html')) : res.redirect('/login.html'));
app.get('/login.html', (req, res) => req.user ? res.redirect('/') : res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register.html', (req, res) => req.user ? res.redirect('/') : res.sendFile(path.join(__dirname, 'public', 'register.html')));

app.post('/api/register', async (req, res) => {
  const { fullName, email, password } = req.body;
  const data = await getData();
  if (data.users.some(u => u.email === email)) return res.json({ success: false, message: "البريد موجود" });

  const user = { id: uuidv4(), fullName, email, password: await bcrypt.hash(password, 12), avatar: '/images/default-avatar.png', createdAt: Date.now() };
  data.users.push(user);
  await saveData(data);
  req.session.userId = user.id;
  res.json({ success: true });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const data = await getData();
  const user = data.users.find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) return res.json({ success: false, message: "بيانات خاطئة" });
  req.session.userId = user.id;
  res.json({ success: true });
});

app.get('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

app.get('/api/posts', async (req, res) => {
  if (!req.user) return res.status(401).json([]);
  const data = await getData();
  const posts = data.posts
    .map(p => {
      const author = data.users.find(u => u.id === p.authorId) || { fullName: 'محذوف', avatar: '/images/default-avatar.png' };
      return { ...p, authorName: author.fullName, authorAvatar: author.avatar,
        likesCount: data.likes.filter(l => l.postId === p.id).length,
        isLiked: data.likes.some(l => l.postId === p.id && l.userId === req.user.id)
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(posts);
});

app.post('/api/post', upload.single('image'), async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'غير مسجل' });

  let imageUrl = null;
  if (req.file) imageUrl = await uploadToCloudinary(req.file.buffer);

  const { content } = req.body;
  if (!content?.trim() && !imageUrl) return res.status(400).json({ error: 'فارغ' });

  const data = await getData();
  const post = {
    id: uuidv4(),
    authorId: req.user.id,
    content: content?.trim() || '',
    image: imageUrl,
    createdAt: Date.now()
  };
  data.posts.unshift(post); // أحدث فوق
  await saveData(data);
  res.json({ success: true, post: { ...post, authorName: req.user.fullName, authorAvatar: req.user.avatar, likesCount: 0, isLiked: false } });
});

app.listen(PORT, '0.0.0.0', () => console.log(`MiniBook شغال على المنفذ ${PORT}`));
