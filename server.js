
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = 3000;
const SECRET = 'your-secret-key'; // غيرها في الإنتاج
const DB_FILE = './database.json';

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

// وظيفة لقراءة DB
async function readDB() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { users: [], posts: [], groups: [] };
  }
}

// وظيفة لكتابة DB
async function writeDB(db) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

// middleware للتوثيق
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

// روتات المستخدمين
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });
  const db = await readDB();
  if (db.users.find(u => u.username === username)) return res.status(409).json({ error: 'User exists' });
  const hash = await bcrypt.hash(password, 10);
  const user = { id: Date.now(), username, passwordHash: hash, profile: { name: username, bio: '', avatar: '' } };
  db.users.push(user);
  await writeDB(db);
  res.json({ message: 'Registered' });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = await readDB();
  const user = db.users.find(u => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '1h' });
  res.json({ token });
});

app.get('/profile', authenticate, async (req, res) => {
  const db = await readDB();
  const user = db.users.find(u => u.id === req.userId);
  res.json(user.profile);
});

app.put('/profile', authenticate, async (req, res) => {
  const { name, bio, avatar } = req.body;
  const db = await readDB();
  const user = db.users.find(u => u.id === req.userId);
  if (user) {
    user.profile = { name, bio, avatar };
    await writeDB(db);
    res.json({ message: 'Profile updated' });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// روتات المنشورات
app.post('/posts', authenticate, async (req, res) => {
  const { content } = req.body;
  const db = await readDB();
  const post = { id: Date.now(), userId: req.userId, content, likes: [], comments: [] };
  db.posts.push(post);
  await writeDB(db);
  res.json(post);
});

app.get('/feed', authenticate, async (req, res) => {
  const db = await readDB();
  const posts = db.posts.sort((a, b) => b.id - a.id).slice(0, 20); // تحسين: حد 20 منشورًا
  res.json(posts);
});

app.post('/posts/:id/like', authenticate, async (req, res) => {
  const { id } = req.params;
  const db = await readDB();
  const post = db.posts.find(p => p.id === parseInt(id));
  if (post && !post.likes.includes(req.userId)) {
    post.likes.push(req.userId);
    await writeDB(db);
    res.json({ likes: post.likes.length });
  } else {
    res.status(400).json({ error: 'Invalid action' });
  }
});

app.post('/posts/:id/comment', authenticate, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const db = await readDB();
  const post = db.posts.find(p => p.id === parseInt(id));
  if (post) {
    post.comments.push({ userId: req.userId, text });
    await writeDB(db);
    res.json(post.comments);
  } else {
    res.status(404).json({ error: 'Post not found' });
  }
});

// روتات المجموعات
app.post('/groups', authenticate, async (req, res) => {
  const { name } = req.body;
  const db = await readDB();
  const group = { id: Date.now(), name, members: [req.userId], posts: [] };
  db.groups.push(group);
  await writeDB(db);
  res.json(group);
});

app.get('/groups', async (req, res) => {
  const db = await readDB();
  res.json(db.groups);
});

app.post('/groups/:id/join', authenticate, async (req, res) => {
  const { id } = req.params;
  const db = await readDB();
  const group = db.groups.find(g => g.id === parseInt(id));
  if (group && !group.members.includes(req.userId)) {
    group.members.push(req.userId);
    await writeDB(db);
    res.json({ message: 'Joined' });
  } else {
    res.status(400).json({ error: 'Invalid action' });
  }
});

app.post('/groups/:id/posts', authenticate, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const db = await readDB();
  const group = db.groups.find(g => g.id === parseInt(id));
  if (group && group.members.includes(req.userId)) {
    const post = { id: Date.now(), userId: req.userId, content, likes: [], comments: [] };
    group.posts.push(post);
    await writeDB(db);
    res.json(post);
  } else {
    res.status(403).json({ error: 'Not authorized' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
