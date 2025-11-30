// server.js – نسخة MongoDB Atlas نهائية (شغالة الآن على Render)
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

// اتصال بـ MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://minibook:MiniBook2025!@minibook-cluster.xxxxx.mongodb.net/minibook?retryWrites=true&w=majority');

const UserSchema = new mongoose.Schema({
  id: String,
  fullName: String,
  email: String,
  password: String,
  avatar: String,
  createdAt: Number
});

const PostSchema = new mongoose.Schema({
  id: String,
  authorId: String,
  content: String,
  image: String,
  createdAt: Number
});

const User = mongoose.model('User', UserSchema);
const Post = mongoose.model('Post', PostSchema);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage() });

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  store: new FileStore({ path: './sessions' }),
  secret: process.env.SESSION_SECRET || 'my-super-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7*24*60*60*1000 }
}));

app.use(async (req, res, next) => {
  if (req.session.userId) {
    req.user = await User.findOne({ id: req.session.userId });
  }
  next();
});

const uploadToCloudinary = (buffer) => new Promise((resolve, reject) => {
  cloudinary.uploader.upload_stream(
    { folder: 'minibook' },
    (err, result) => err ? reject(err) : resolve(result.secure_url)
  ).end(buffer);
});

// Routes
app.get('/', (req, res) => req.user ? res.sendFile(path.join(__dirname, 'public', 'index.html')) : res.redirect('/login.html'));
app.get('/login.html', (req, res) => req.user ? res.redirect('/') : res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register.html', (req, res) => req.user ? res.redirect('/') : res.sendFile(path.join(__dirname, 'public', 'register.html')));

app.post('/api/register', async (req, res) => {
  const { fullName, email, password } = req.body;
  if (await User.findOne({ email })) return res.json({ success: false, message: "البريد موجود" });

  const user = new User({
    id: uuidv4(),
    fullName,
    email,
    password: await bcrypt.hash(password, 12),
    avatar: '/images/default-avatar.png',
    createdAt: Date.now()
  });
  await user.save();
  req.session.userId = user.id;
  res.json({ success: true });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) return res.json({ success: false, message: "بيانات خاطئة" });
  req.session.userId = user.id;
  res.json({ success: true });
});

app.get('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

app.get('/api/posts', async (req, res) => {
  if (!req.user) return res.status(401).json([]);
  const posts = await Post.find().sort({ createdAt: -1 });
  const users = await User.find();

  const result = posts.map(p => {
    const author = users.find(u => u.id === p.authorId) || { fullName: 'محذوف', avatar: '/images/default-avatar.png' };
    return {
      ...p.toObject(),
      authorName: author.fullName,
      authorAvatar: author.avatar,
      likesCount: 0,
      isLiked: false
    };
  });
  res.json(result);
});

app.post('/api/post', upload.single('image'), async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'غير مسجل' });

  let imageUrl = null;
  if (req.file) imageUrl = await uploadToCloudinary(req.file.buffer);

  const post = new Post({
    id: uuidv4(),
    authorId: req.user.id,
    content: req.body.content?.trim() || '',
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
});

app.listen(PORT, '0.0.0.0', () => console.log(`MiniBook يعمل على المنفذ ${PORT}`));
