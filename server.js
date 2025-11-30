
// server.js – النسخة المحسنة أمنياً
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
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== إعدادات متقدمة لـ Cloudinary ====================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// ==================== Rate Limiting للحماية من الهجمات ====================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // حد أقصى 100 طلب لكل IP
  message: { error: 'تم تجاوز عدد الطلبات المسموح بها' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // ساعة واحدة
  max: 5, // 5 محاولات تسجيل دخول فقط
  message: { error: 'تم تجاوز محاولات التسجيل، حاول لاحقاً' }
});

// ==================== إعداد Multer محسن ====================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB حد أقصى
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم'), false);
    }
  }
});

// ==================== اتصال MongoDB محسن ====================
mongoose.connect(process.env.MONGODB_URI, {
  autoSelectFamily: false,
  family: 4,
  tls: true,
  tlsInsecure: false,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 2,
  maxIdleTimeMS: 30000,
  heartbeatFrequencyMS: 10000,
}).catch(err => console.error('خطأ في الاتصال الأولي:', err));

// ==================== نماذج MongoDB محسنة ====================
const UserSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  fullName: { type: String, required: true, trim: true },
  email: { 
    type: String, 
    unique: true, 
    required: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'البريد الإلكتروني غير صالح']
  },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '/images/default-avatar.png' },
  createdAt: { type: Number, default: () => Date.now() },
  lastLogin: { type: Number, default: () => Date.now() }
});

const PostSchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },
  authorId: { type: String, required: true },
  content: { 
    type: String, 
    required: function() { return !this.image; },
    maxlength: 5000,
    trim: true 
  },
  image: String,
  createdAt: { type: Number, default: () => Date.now() },
  likes: { type: [String], default: [] }, // array of user IDs
  comments: [{
    id: String,
    authorId: String,
    content: String,
    createdAt: Number
  }]
});

const User = mongoose.model('User', UserSchema);
const Post = mongoose.model('Post', PostSchema);

// ==================== Middleware محسن ====================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(limiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static('public', {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// جلسات محسنة
app.use(session({
  store: new FileStore({ 
    path: './sessions', 
    retries: 2,
    ttl: 7 * 24 * 60 * 60 // 7 أيام
  }),
  name: 'connectly.sid',
  secret: process.env.SESSION_SECRET || uuidv4(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  }
}));

// Middleware تحسين الأداء والأمان
app.use(async (req, res, next) => {
  // الحماية من XSS
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  if (req.session.userId) {
    try {
      const user = await User.findOne({ id: req.session.userId });
      if (user) {
        req.user = user;
        // تحديث آخر login
        await User.updateOne({ id: user.id }, { lastLogin: Date.now() });
      } else {
        req.session.destroy();
      }
    } catch (err) {
      console.error('خطأ في جلب المستخدم:', err);
    }
  }
  next();
});

// ==================== وظائف مساعدة محسنة ====================
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: 'connectly',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
        transformation: [
          { width: 1200, height: 630, crop: 'limit' },
          { quality: 'auto' },
          { format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
};

// التحقق من المصادقة
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  }
  next();
};

// التحقق من ملكية المنشور
const checkPostOwnership = async (req, res, next) => {
  try {
    const post = await Post.findOne({ id: req.params.postId });
    if (!post) {
      return res.status(404).json({ error: 'المنشور غير موجود' });
    }
    if (post.authorId !== req.user.id) {
      return res.status(403).json({ error: 'غير مصرح به' });
    }
    req.post = post;
    next();
  } catch (error) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
};

// ==================== Routes محسنة ====================
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

// ==================== APIs محسنة ====================

// تسجيل مستخدم جديد
app.post('/api/register', authLimiter, async (req, res) => {
  const { fullName, email, password } = req.body;
  
  try {
    // تحقق من البيانات
    if (!fullName?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ success: false, message: "جميع الحقول مطلوبة" });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
    }

    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ success: false, message: "البريد الإلكتروني مسجل مسبقًا" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = new User({
      id: uuidv4(),
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      password: hashed
    });

    await user.save();
    req.session.userId = user.id;
    
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('خطأ في التسجيل:', err);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// تسجيل الدخول
app.post('/api/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: "بيانات الدخول غير صحيحة" });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: "بيانات الدخول غير صحيحة" });
    }

    req.session.userId = user.id;
    await User.updateOne({ id: user.id }, { lastLogin: Date.now() });
    
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('خطأ في الدخول:', err);
    res.status(500).json({ success: false, message: "خطأ في الخادم" });
  }
});

// تسجيل الخروج
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: "خطأ في تسجيل الخروج" });
    }
    res.clearCookie('connectly.sid');
    res.json({ success: true });
  });
});

// جلب المنشورات مع pagination
app.get('/api/posts', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const users = await User.find({}, 'id fullName avatar');
    const userMap = new Map(users.map(user => [user.id, user]));

    const result = posts.map(post => {
      const author = userMap.get(post.authorId) || { 
        fullName: 'مستخدم محذوف', 
        avatar: '/images/default-avatar.png' 
      };
      
      return {
        ...post.toObject(),
        authorName: author.fullName,
        authorAvatar: author.avatar,
        likesCount: post.likes.length,
        isLiked: post.likes.includes(req.user.id),
        commentsCount: post.comments.length
      };
    });

    res.json({
      success: true,
      posts: result,
      pagination: {
        page,
        limit,
        hasMore: posts.length === limit
      }
    });
  } catch (err) {
    console.error('خطأ في جلب المنشورات:', err);
    res.status(500).json({ success: false, posts: [] });
  }
});

// إنشاء منشور
app.post('/api/posts', requireAuth, upload.single('image'), async (req, res) => {
  let imageUrl = null;
  
  if (req.file) {
    try {
      imageUrl = await uploadToCloudinary(req.file.buffer);
    } catch (err) {
      return res.status(500).json({ success: false, error: 'فشل رفع الصورة' });
    }
  }

  const { content } = req.body;
  if (!content?.trim() && !imageUrl) {
    return res.status(400).json({ success: false, error: 'المنشور فارغ' });
  }

  try {
    const post = new Post({
      id: uuidv4(),
      authorId: req.user.id,
      content: content?.trim() || '',
      image: imageUrl
    });

    await post.save();

    res.json({
      success: true,
      post: {
        ...post.toObject(),
        authorName: req.user.fullName,
        authorAvatar: req.user.avatar,
        likesCount: 0,
        isLiked: false,
        commentsCount: 0
      }
    });
  } catch (err) {
    console.error('خطأ في إنشاء المنشور:', err);
    res.status(500).json({ success: false, error: 'فشل حفظ المنشور' });
  }
});

// الإعجاب بالمنشور
app.post('/api/posts/:postId/like', requireAuth, async (req, res) => {
  try {
    const post = await Post.findOne({ id: req.params.postId });
    if (!post) {
      return res.status(404).json({ success: false, error: 'المنشور غير موجود' });
    }

    const likeIndex = post.likes.indexOf(req.user.id);
    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(req.user.id);
    }

    await post.save();

    res.json({
      success: true,
      likesCount: post.likes.length,
      isLiked: post.likes.includes(req.user.id)
    });
  } catch (err) {
    console.error('خطأ في الإعجاب:', err);
    res.status(500).json({ success: false, error: 'خطأ في الخادم' });
  }
});

// إضافة تعليق
app.post('/api/posts/:postId/comments', requireAuth, async (req, res) => {
  const { content } = req.body;
  
  if (!content?.trim()) {
    return res.status(400).json({ success: false, error: 'التعليق فارغ' });
  }

  try {
    const post = await Post.findOne({ id: req.params.postId });
    if (!post) {
      return res.status(404).json({ success: false, error: 'المنشور غير موجود' });
    }

    const comment = {
      id: uuidv4(),
      authorId: req.user.id,
      content: content.trim(),
      createdAt: Date.now()
    };

    post.comments.push(comment);
    await post.save();

    res.json({
      success: true,
      comment: {
        ...comment,
        authorName: req.user.fullName,
        authorAvatar: req.user.avatar
      }
    });
  } catch (err) {
    console.error('خطأ في إضافة التعليق:', err);
    res.status(500).json({ success: false, error: 'خطأ في الخادم' });
  }
});

// جلب التعليقات
app.get('/api/posts/:postId/comments', requireAuth, async (req, res) => {
  try {
    const post = await Post.findOne({ id: req.params.postId });
    if (!post) {
      return res.status(404).json({ success: false, error: 'المنشور غير موجود' });
    }

    const users = await User.find({ id: { $in: post.comments.map(c => c.authorId) } }, 'id fullName avatar');
    const userMap = new Map(users.map(user => [user.id, user]));

    const comments = post.comments.map(comment => ({
      ...comment.toObject?.(),
      authorName: userMap.get(comment.authorId)?.fullName || 'مستخدم محذوف',
      authorAvatar: userMap.get(comment.authorId)?.avatar || '/images/default-avatar.png'
    }));

    res.json({ success: true, comments });
  } catch (err) {
    console.error('خطأ في جلب التعليقات:', err);
    res.status(500).json({ success: false, error: 'خطأ في الخادم' });
  }
});

// حذف المنشور
app.delete('/api/posts/:postId', requireAuth, checkPostOwnership, async (req, res) => {
  try {
    await Post.deleteOne({ id: req.params.postId });
    res.json({ success: true });
  } catch (err) {
    console.error('خطأ في حذف المنشور:', err);
    res.status(500).json({ success: false, error: 'خطأ في الخادم' });
  }
});

// ==================== Health Check ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ==================== معالجة الأخطاء ====================
app.use((err, req, res, next) => {
  console.error('خطأ غير متوقع:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'حجم الملف كبير جداً' });
    }
  }
  
  res.status(500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'production' ? 'حدث خطأ غير متوقع' : err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'الصفحة غير موجودة' });
});

// ==================== بدء الخادم ====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Connectly يعمل الآن على المنفذ ${PORT}`);
  console.log(`📍 البيئة: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 قاعدة البيانات: ${mongoose.connection.readyState === 1 ? 'متصل' : 'غير متصل'}`);
});
