let token = localStorage.getItem('token');

if (token) showFeed();
else showAuth();

function showAuth() {
  document.getElementById('auth').classList.remove('hidden');
  document.getElementById('feed').classList.add('hidden');
}

function showFeed() {
  document.getElementById('auth').classList.add('hidden');
  document.getElementById('feed').classList.remove('hidden');
  loadPosts();
}

async function register() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const res = await fetch('/register', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username, password})});
  alert((await res.json()).msg);
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const res = await fetch('/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username, password})});
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    token = data.token;
    showFeed();
  } else {
    alert(data.msg);
  }
}

async function createPost() {
  const content = document.getElementById('postContent').value;
  if (!content) return;
  await fetch('/posts', { method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`}, body: JSON.stringify({content})});
  document.getElementById('postContent').value = '';
  loadPosts();
}

async function loadPosts() {
  const res = await fetch('/posts', { headers: {'Authorization': `Bearer ${token}`}});
  const posts = await res.json();
  const container = document.getElementById('posts');
  container.innerHTML = '';
  posts.forEach(post => {
    const div = document.createElement('div');
    div.className = 'post card';
    div.innerHTML = `
      <div style="font-weight:bold;margin-bottom:10px;">مستخدم ${post.userId}</div>
      <div>${post.content}</div>
      <div class="actions">
        <button onclick="like(\( {post.id})">إعجاب ( \){post.likes})</button>
        <button onclick="toggleCommentBox(${post.id})">تعليق</button>
      </div>
      <div id="comment-box-${post.id}" style="display:none;margin-top:10px;">
        <input id="c-input-${post.id}" placeholder="اكتب تعليق...">
        <button onclick="comment(${post.id})">إرسال</button>
      </div>
      <div style="margin-top:10px;">
        \( {post.comments.map(c => `<div style="padding:5px 0;color:#65676b;">مستخدم \){c.userId}: ${c.content}</div>`).join('')}
      </div>
    `;
    container.appendChild(div);
  });
}

function toggleCommentBox(id) {
  const box = document.getElementById(`comment-box-${id}`);
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

async function like(id) {
  await fetch(`/posts/\( {id}/like`, { method: 'POST', headers: {'Authorization': `Bearer \){token}`}});
  loadPosts();
}

async function comment(id) {
  const input = document.getElementById(`c-input-${id}`);
  const content = input.value;
  if (!content) return;
  await fetch(`/posts/\( {id}/comment`, { method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': `Bearer \){token}`}, body: JSON.stringify({content})});
  input.value = '';
  loadPosts();
}
