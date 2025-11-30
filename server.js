const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path'); // إضافة للتعامل مع المسارات
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = 3000;
const SECRET = 'your-secret-key';
const DB_FILE = path.join(__dirname, 'database.json'); // مسار مطلق لتجنب المشاكل

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

// وظيفة لقراءة DB مع التهيئة الافتراضية
async function readDB() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading DB:', err.message); // logging للأخطاء
    // إنشاء الملف إذا غير موجود
    const defaultDB = { users: [], posts: [], groups: [] };
    await writeDB(defaultDB);
    return defaultDB;
  }
}

// وظيفة لكتابة DB
async function writeDB(db) {
  try {
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
    console.log('DB written successfully'); // logging للتأكيد
  } catch (err) {
    console.error('Error writing DB:', err.message);
    throw err; // رفع الخطأ للـ endpoint
  }
}

// middleware للتوثيق (دون تغيير)
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// روتات المستخدمين مع logging إضافي
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  try {
    const db = await readDB();
    if (db.users.find(u => u.username === username)) return res.status(409).json({ error: 'User exists' });
    const hash = await bcrypt.hash(password, 10);
    const user = { id: Date.now(), username, passwordHash: hash, profile: { name: username, bio: '', avatar: '' } };
    db.users.push(user);
    await writeDB(db);
    res.json({ message: 'Registered' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const db = await readDB();
    const user = db.users.find(u => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// باقي الروتات دون تغيير (أضف try-catch مشابه إذا لزم للروتات الأخرى)

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
