// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== قاعدة البيانات ====================
const adapter = new JSONFile('database.json');
const db = new Low(adapter);
await db.read();
db.data ||= { 
  users: [], 
  posts: [], 
  comments: [], 
  likes: [],
  sessions: [] 
};
await db.write();

// ==================== الأمان الأساسي ====================
app.use(helmet({
  contentSecurityPolicy: false, // نتحكم فيه يدويًا إذا احتجنا لاحقًا
}));

// Rate limiting: 100 طلب كل 15 دقيقة لكل IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "الكثير من الطلبات، حاول مرة أخرى لاحقًا",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter); // فقط على الـ API لاحقًا
app.use(limiter); // أو على كل الموقع

// ==================== الجلسات الآمنة ====================
app.use(session({
  store: new FileStore({
    path: './sessions',
    ttl: 60 * 60 * 24 * 7, // أسبوع
    retries: 2
  }),
  secret: process.env.SESSION_SECRET || 'mini-book-super-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // true فقط على HTTPS
    sameSite: 'strict',
    maxAge: 1000 * 60 * 60 * 24 * 7 // أسبوع
  }
}));

// ==================== Cloudinary ====================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'minibook',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  },
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 ميجا كحد أقصى
});

// ==================== Middleware ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// middleware لإرفاق المستخدم الحالي في كل طلب
const attachUser = async (req, res, next) => {
  if (req.session.userId) {
    await db.read();
    req.user = db.data.users.find(u => u.id === req.session.userId);
  }
  next();
};
app.use(attachUser);

// middleware لحماية الصفحات التي تتطلب تسجيل دخول
const requireLogin = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/login?msg=يجب تسجيل الدخول أولاً');
  }
  next();
};

// ==================== الصفحات الرئيسية ====================

// الصفحة الرئيسية (الفيد)
app.get('/', requireLogin, async (req, res) => {
  await db.read();
  const posts = db.data.posts
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(post => {
      const author = db.data.users.find(u => u.id === post.authorId);
      post.authorName = author ? author.fullName : "مستخدم محذوف";
      post.authorAvatar = author ? author.avatar : "/images/default-avatar.png";
      post.likesCount = db.data.likes.filter(l => l.postId === post.id).length;
      post.commentsCount = db.data.comments.filter(c => c.postId === post.id).length;
      post.isLiked = db.data.likes.some(l => l.postId === post.id && l.userId === req.user.id);
      return post;
    });

  res.render('index', { user: req.user, posts });
});

// صفحة التسجيل
app.get('/register', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('register', { error: null });
});

app.post('/register', async (req, res) => {
  const { fullName, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render('register', { error: "كلمتا المرور غير متطابقتين" });
  }

  await db.read();
  if (db.data.users.some(u => u.email === email)) {
    return res.render('register', { error: "البريد الإلكتروني مسجل مسبقًا" });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = {
    id: uuidv4(),
    fullName,
    email,
    password: hashedPassword,
    avatar: "https://res.cloudinary.com/yourcloud/image/upload/v1/minibook/default-avatar.png", // يمكنك رفع صورة افتراضية
    createdAt: Date.now()
  };

  db.data.users.push(newUser);
  await db.write();

  // تسجيل دخول تلقائي بعد التسجيل
  req.session.userId = newUser.id;
  res.redirect('/');
});

// صفحة تسجيل الدخول
app.get('/login', (req, res) => {
  if (req.user) return res.redirect('/');
  res.render('login', { error: req.query.msg || null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  await db.read();
  const user = db.data.users.find(u => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render('login', { error: "بيانات الدخول غير صحيحة" });
  }

  req.session.userId = user.id;
  res.redirect('/');
});

// تسجيل الخروج
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// ==================== إنشاء منشور ====================
app.post('/post', requireLogin, upload.single('image'), async (req, res) => {
  const { content } = req.body;

  if (!content.trim() && !req.file) {
    return res.redirect('/');
  }

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

  res.redirect('/');
});

// باقي الـ API (إعجاب، تعليق، حذف...) سنضيفها في الخطوة القادمة

app.listen(PORT, () => {
  console.log(`MiniBook يعمل بأمان عالي على http://localhost:${PORT}`);
});
