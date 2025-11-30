// server.js – النسخة النهائية المستقرة 100% على Render + MongoDB Atlas (2025)
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== إعدادات Cloudinary ====================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ==================== إعداد Multer (رفع الصور مؤقتًا في الذاكرة) ====================
const upload = multer({ storage: multer.memoryStorage() });

// ==================== الاتصال بـ MongoDB Atlas (الحل النهائي لكل أخطاء SSL) ====================
mongoose.connect(process.env.MONGODB_URI, {
  autoSelectFamily: false,     // ← يمنع مشاكل IPv6 نهائيًا
  family: 4,                   // IPv4 فقط (الأكثر استقرارًا مع Atlas)
  tls: true,
  tlsInsecure: false,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 5,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  heartbeatFrequencyMS: 10000,
}).catch(err => console.error('خطأ في الاتصال الأولي:', err));

mongoose.connection.on('connected', () => {
  console.log('تم الاتصال بـ MongoDB Atlas بنجاح');
});

mongoose.connection.on('error', (err) => {
  console.error('خطأ في MongoDB:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('انقطع الاتصال – سيُعاد المحاولة تلقائيًا...');
});

// ==================== نماذج MongoDB ====================
const UserSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  fullName: String,
  email: { type: String, unique: true },
  password: String,
  avatar: { type: String, default: '/images/default-avatar.png' },
  createdAt: Number
});

const PostSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  authorId: String,
  content: String,
  image: String,
  createdAt: Number
});

const User = mongoose.model('User', UserSchema);
const Post = mongoose.model('Post', PostSchema);

// ==================== Middleware ====================
app.use(helmet({
  contentSecurityPolicy: false // نتحكم فيها يدويًا إذا احتجنا
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  store: new FileStore({ path: './sessions', retries: 2 }),
  secret: process.env.SESSION_SECRET || 'mini-book-secret-2025-very-strong',
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
    try {
      req.user = await User.findOne({ id: req.session.userId });
    } catch (err) {
      console.error('خطأ في جلب المستخدم:', err);
    }
  }
  next();
});

// ==================== رفع الصور إلى Cloudinary ====================
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'minibook', allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'] },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    ).end(buffer);
  });
};

// ==================== الصفحات الرئيسية ====================
app.get('/', (req, res) => {
  if (!req.user) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login.html', (req, res) => req.user ? res.redirect('/') : res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register.html', (req, res) => req.user ? res.redirect('/') : res.sendFile(path.join(__dirname, 'public', 'register.html')));

// ==================== APIs ====================

// تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (await User.findOne({ email })) {
      return res.json({ success: false, message: "البريد الإلكتروني مسجل مسبقًا" });
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = new User({
      id: uuidv4(),
      fullName,
      email,
      password: hashed,
      createdAt: Date.now()
    });
    await user.save();
    req.session.userId = user.id;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.json({ success: false, message: "بيانات الدخول غير صحيحة" });
    }
    req.session.userId = user.id;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// تسجيل الخروج
app.get('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// جلب المنشورات
app.get('/api/posts', async (req, res) => {
  if (!req.user) return res.status(401).json([]);
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    const users = await User.find({}, 'id fullName avatar');

    const result = posts.map(post => {
      const author = users.find(u => u.id === post.authorId) || { fullName: 'محذوف', avatar: '/images/default-avatar.png' };
      return {
        ...post.toObject(),
        authorName: author.fullName,
        authorAvatar: author.avatar,
        likesCount: 0,
        isLiked: false
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json([]);
  }
});

// إنشاء منشور
app.post('/api/post', upload.single('image'), async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'غير مسجل الدخول' });

  let imageUrl = null;
  if (req.file) {
    try {
      imageUrl = await uploadToCloudinary(req.file.buffer);
    } catch (err) {
      return res.status(500).json({ error: 'فشل رفع الصورة' });
    }
  }

  const { content } = req.body;
  if (!content?.trim() && !imageUrl) {
    return res.status(400).json({ error: 'المنشور فارغ' });
  }

  try {
    const post = new Post({
      id: uuidv4(),
      authorId: req.user.id,
      content: content?.trim() || '',
      image: imageUrl,
      createdAt: Date.now()
    });
    await post.save();

    res.json({
      success: true,
      post: {
        ...post.toObject(),
        authorName: req.user.fullName,
        authorAvatar: req.user.avatar,
        likesCount: 0,
        isLiked: false
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'فشل حفظ المنشور' });
  }
});

// ==================== بدء الخادم ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`MiniBook يعمل الآن على المنفذ ${PORT}`);
  console.log(`افتح: https://your-app.onrender.com`);
});
