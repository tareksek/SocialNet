
// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs'); // أضفناه
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

// إعادة توجيه الجذر إلى تسجيل الدخول
app.get('/', (req, res) => {
  res.redirect('/login');
});

// 🔍 دالة مساعدة لقراءة قاعدة البيانات مع تسجيل ما يحدث
function readDB() {
  const dbPath = path.join(__dirname, 'database.json');
  if (!fs.existsSync(dbPath)) {
    console.log('⚠️ database.json غير موجود — جاري إنشاؤه...');
    fs.writeFileSync(dbPath, JSON.stringify({ users: [] }, null, 2), 'utf8');
  }
  const data = fs.readFileSync(dbPath, 'utf8');
  console.log('✅ قُرئت قاعدة البيانات من database.json');
  return JSON.parse(data);
}

// 🔒 دالة مساعدة لكتابة قاعدة البيانات مع تسجيل ما يحدث
function writeDB(data) {
  const dbPath = path.join(__dirname, 'database.json');
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('💾 تمت كتابة البيانات إلى database.json');
  console.log('📊 عدد المستخدمين الآن:', data.users.length);
}

// API: جلب المشاركات (نحتفظ به كما هو)
app.get('/api/posts', (req, res) => {
  try {
    const db = readDB();
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
    console.log('✅ تم جلب', posts.length, 'منشور');
    res.json(posts);
  } catch (err) {
    console.error('❌ فشل في جلب المشاركات:', err.message);
    res.status(500).json({ error: 'خطأ داخلي في السيرفر' });
  }
});

// API: نشر منشور (نحتفظ به — لكن نضيف auth لاحقًا)
app.use('/api/posts', (req, res, next) => {
  // هنا يمكن إضافة middleware للتحقق من الجلسة لاحقًا
  next();
});

app.post('/api/posts', (req, res) => {
  try {
    const { userId, content } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      console.log('❌ فشل النشر — المستخدم غير موجود:', userId);
      return res.status(404).json({ error: 'مستخدم غير موجود' });
    }
    const post = {
      id: user.posts.length ? Math.max(...user.posts.map(p => p.id)) + 1 : 1,
      userId,
      content: require('./utils/security').sanitizeInput(content),
      timestamp: new Date().toISOString()
    };
    user.posts.push(post);
    writeDB(db); // ← هنا سترى "💾 تمت كتابة..."
    console.log('✅ تم نشر منشور جديد من:', user.username);
    res.status(201).json(post);
  } catch (err) {
    console.error('❌ فشل في نشر المنشور:', err.message);
    res.status(500).json({ error: 'خطأ داخلي في السيرفر' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ يعمل على http://localhost:${PORT}`);
});
