
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// مسار قاعدة البيانات
const DB_PATH = path.join(__dirname, 'database.json');

// دالة قراءة قاعدة البيانات
function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }, null, 2));
  }
  const data = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(data);
}

// دالة كتابة قاعدة البيانات
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// 📌 API: تسجيل مستخدم جديد
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  const db = readDB();

  // تحقق من عدم تكرار البريد أو الاسم
  const existingUser = db.users.find(u => u.email === email || u.username === username);
  if (existingUser) {
    return res.status(409).json({ error: 'المستخدم موجود مسبقًا' });
  }

  const newUser = {
    id: db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
    username,
    email,
    password, // ⚠️ غير آمن — فقط للتجربة
    posts: []
  };

  db.users.push(newUser);
  writeDB(db);

  res.status(201).json({ message: 'تم التسجيل بنجاح', userId: newUser.id });
});

// 📌 API: تسجيل دخول
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDB();

  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });
  }

  res.json({ message: 'تم تسجيل الدخول', user: { id: user.id, username: user.username } });
});

// 📌 API: إضافة مشاركة
app.post('/api/posts', (req, res) => {
  const { userId, content } = req.body;

  if (!userId || !content) {
    return res.status(400).json({ error: 'معرف المستخدم والمحتوى مطلوبان' });
  }

  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'المستخدم غير موجود' });
  }

  const newPost = {
    id: user.posts.length ? Math.max(...user.posts.map(p => p.id)) + 1 : 1,
    userId,
    content,
    timestamp: new Date().toISOString()
  };

  user.posts.push(newPost);
  writeDB(db);

  res.status(201).json(newPost);
});

// 📌 API: جلب جميع المشاركات (مع أسماء أصحابها)
app.get('/api/posts', (req, res) => {
  const db = readDB();
  const allPosts = [];

  db.users.forEach(user => {
    user.posts.forEach(post => {
      allPosts.push({
        id: post.id,
        userId: post.userId,
        username: user.username,
        content: post.content,
        timestamp: post.timestamp
      });
    });
  });

  // ترتيب عكسي (الأحدث أولًا)
  allPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(allPosts);
});

// 🌐 خدمة الصفحات (login، register، feed)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/feed', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'feed.html'));
});

// 🏠 توجيه الجذر إلى تسجيل الدخول
app.get('/', (req, res) => {
  res.redirect('/login');
});

// 🌐 خدمة الواجهة الأمامية (index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ السيرفر يعمل على المنفذ ${PORT}`);
});
