
// routes/auth.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sanitizeInput, isValidEmail, isValidUsername } = require('../utils/security');

const DB_PATH = path.join(__dirname, '..', 'database.json');

// 🔍 دالة مساعدة لقراءة قاعدة البيانات مع تسجيل ما يحدث
function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    console.log('⚠️ database.json غير موجود — جاري إنشاؤه...');
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }, null, 2), 'utf8');
  }
  const data = fs.readFileSync(DB_PATH, 'utf8');
  console.log('✅ قُرئت قاعدة البيانات من database.json');
  return JSON.parse(data);
}

// 🔐 دالة مساعدة لكتابة قاعدة البيانات مع تسجيل ما يحدث
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('💾 تمت كتابة البيانات إلى database.json');
  console.log('📊 عدد المستخدمين الآن:', data.users.length);
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  let { username, email, password } = req.body;

  // تنقية المدخلات
  username = sanitizeInput(username);
  email = sanitizeInput(email).toLowerCase();
  password = sanitizeInput(password);

  console.log('🔍 محاولة تسجيل مستخدم جديد:', { username, email });

  // التحقق من الفراغ
  if (!username || !email || !password) {
    console.log('❌ حقول فارغة في التسجيل');
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
  }

  // التحقق من الصحة
  if (!isValidUsername(username)) {
    console.log('❌ اسم المستخدم غير صالح:', username);
    return res.status(400).json({ 
      error: 'اسم المستخدم يجب أن يكون 3-20 حرفًا (عربي/إنجليزي، أرقام، _، -، مسافات فقط)' 
    });
  }

  if (!isValidEmail(email)) {
    console.log('❌ البريد الإلكتروني غير صالح:', email);
    return res.status(400).json({ error: 'البريد الإلكتروني غير صالح' });
  }

  if (password.length < 6) {
    console.log('❌ كلمة المرور قصيرة جدًا:', password);
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }

  const db = readDB();

  // تحقق من التكرار (بعد التنقية!)
  const existing = db.users.find(u => 
    u.email.toLowerCase() === email || 
    u.username === username
  );

  if (existing) {
    console.log('❌ المستخدم موجود مسبقًا:', email);
    return res.status(409).json({ error: 'البريد أو اسم المستخدم مستخدم مسبقًا' });
  }

  const newUser = {
    id: db.users.length ? Math.max(...db.users.map(u => u.id)) + 1 : 1,
    username,
    email,
    password, // ⚠️ للتجربة فقط — في الواقع: استخدم bcrypt
    posts: [],
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db); // ← هنا سترى: "💾 تمت كتابة..."

  console.log('✅ تم تسجيل مستخدم جديد:', newUser);
  res.status(201).json({ 
    message: 'تم إنشاء الحساب بنجاح',
    userId: newUser.id 
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  let { email, password } = req.body;

  email = sanitizeInput(email).toLowerCase();
  password = sanitizeInput(password);

  console.log('🔍 محاولة تسجيل دخول لـ:', email);

  if (!email || !password) {
    console.log('❌ حقول فارغة في تسجيل الدخول');
    return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });
  }

  const db = readDB();
  const user = db.users.find(u => 
    u.email.toLowerCase() === email && 
    u.password === password
  );

  if (!user) {
    console.log('❌ فشل تسجيل الدخول — المستخدم غير موجود أو كلمة المرور خاطئة:', email);
    return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });
  }

  console.log('✅ تم تسجيل الدخول بنجاح:', user.username);
  // لا نعيد كلمة المرور!
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    },
    token: 'dummy-jwt-token-for-demo' // في الواقع: استخدم JWT
  });
});

module.exports = router;
