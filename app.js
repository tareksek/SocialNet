
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = 3000;
const SECRET = 'your-secret-key';

app.use(cors());
app.use(bodyParser.json());

// Load DB
function loadDB() {
  return JSON.parse(fs.readFileSync('db.json', 'utf8'));
}

// Save DB
function saveDB(db) {
  fs.writeFileSync('db.json', JSON.stringify(db));
}

// Register
app.post('/register', (req, res) => {
  const db = loadDB();
  const { username, password } = req.body;
  if (db.users.find(u => u.username === username)) return res.status(400).json({ msg: 'User exists' });
  const hashed = bcrypt.hashSync(password, 8);
  db.users.push({ id: db.users.length + 1, username, password: hashed });
  saveDB(db);
  res.json({ msg: 'Registered' });
});

// Login
app.post('/login', (req, res) => {
  const db = loadDB();
  const { username, password } = req.body;
  const user = db.users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(400).json({ msg: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Middleware for auth
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ msg: 'No token' });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    next();
  } catch (e) {
    res.status(401).json({ msg: 'Invalid token' });
  }
}

// Get posts (timeline)
app.get('/posts', auth, (req, res) => {
  const db = loadDB();
  res.json(db.posts.sort((a, b) => b.id - a.id)); // Recent first
});

// Create post
app.post('/posts', auth, (req, res) => {
  const db = loadDB();
  const { content } = req.body;
  const post = { id: db.posts.length + 1, userId: req.userId, content, likes: 0, comments: [] };
  db.posts.push(post);
  saveDB(db);
  res.json(post);
});

// Like post
app.post('/posts/:id/like', auth, (req, res) => {
  const db = loadDB();
  const post = db.posts.find(p => p.id == req.params.id);
  if (!post) return res.status(404).json({ msg: 'Post not found' });
  post.likes++;
  saveDB(db);
  res.json({ likes: post.likes });
});

// Comment on post
app.post('/posts/:id/comment', auth, (req, res) => {
  const db = loadDB();
  const post = db.posts.find(p => p.id == req.params.id);
  if (!post) return res.status(404).json({ msg: 'Post not found' });
  const { content } = req.body;
  const comment = { id: db.comments.length + 1, postId: post.id, userId: req.userId, content };
  db.comments.push(comment);
  post.comments.push(comment.id);
  saveDB(db);
  res.json(comment);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
