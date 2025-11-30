
const API = 'http://localhost:3000';
let token = localStorage.getItem('token');

function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(res => res.json()).then(data => {
    if (data.token) {
      token = data.token;
      localStorage.setItem('token', token);
      window.location.href = 'feed.html';
    } else {
      alert('Login failed');
    }
  });
}

function loadFeed() {
  fetch(`${API}/feed`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(res => res.json()).then(posts => {
    const feed = document.getElementById('feed');
    feed.innerHTML = '';
    posts.forEach(post => {
      const div = document.createElement('div');
      div.className = 'post';
      div.innerHTML = `<p>${post.content}</p>
        <button onclick="likePost(\( {post.id})">Like ( \){post.likes.length})</button>
        <textarea id="comment-${post.id}"></textarea>
        <button onclick="commentPost(${post.id})">Comment</button>
        <div>\( {post.comments.map(c => `<p> \){c.text}</p>`).join('')}</div>`;
      feed.appendChild(div);
    });
  });
}

function likePost(id) {
  fetch(`\( {API}/posts/ \){id}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  }).then(() => loadFeed());
}

function commentPost(id) {
  const text = document.getElementById(`comment-${id}`).value;
  fetch(`\( {API}/posts/ \){id}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text })
  }).then(() => loadFeed());
}

// أضف وظائف مشابهة للملف الشخصي والمجموعات
