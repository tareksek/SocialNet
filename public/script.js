
const API = 'http://localhost:3000';
let token = localStorage.getItem('token');

// وظيفة التسجيل
function register() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  }).then(res => res.json()).then(data => {
    if (data.message) {
      alert('Registered successfully');
      window.location.href = 'index.html';
    } else {
      alert('Registration failed');
    }
  });
}

// إنشاء منشور جديد
function createPost() {
  const content = document.getElementById('new-post').value;
  fetch(`${API}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content })
  }).then(() => loadFeed());
}

// تحميل الملف الشخصي
function loadProfile() {
  fetch(`${API}/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(res => res.json()).then(profile => {
    document.getElementById('name').value = profile.name;
    document.getElementById('bio').value = profile.bio;
    document.getElementById('avatar').value = profile.avatar;
    const info = document.getElementById('profile-info');
    info.innerHTML = `<img src="\( {profile.avatar}" alt="Avatar" style="width:100px;"><p> \){profile.name}</p><p>${profile.bio}</p>`;
  });
}

// تحديث الملف الشخصي
function updateProfile() {
  const name = document.getElementById('name').value;
  const bio = document.getElementById('bio').value;
  const avatar = document.getElementById('avatar').value;
  fetch(`${API}/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name, bio, avatar })
  }).then(() => loadProfile());
}

// تحميل المجموعات
function loadGroups() {
  fetch(`${API}/groups`).then(res => res.json()).then(groups => {
    const list = document.getElementById('groups-list');
    list.innerHTML = '';
    groups.forEach(group => {
      const div = document.createElement('div');
      div.className = 'post';
      div.innerHTML = `<h3>${group.name}</h3>
        <button onclick="joinGroup(${group.id})">انضمام</button>
        <a href="group.html?id=${group.id}">عرض المجموعة</a>`;
      list.appendChild(div);
    });
  });
}

// إنشاء مجموعة جديدة
function createGroup() {
  const name = document.getElementById('group-name').value;
  fetch(`${API}/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name })
  }).then(() => loadGroups());
}

// الانضمام إلى مجموعة
function joinGroup(id) {
  fetch(`\( {API}/groups/ \){id}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  }).then(() => loadGroups());
}

// تحميل مجموعة معينة
function loadGroup() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  fetch(`${API}/groups`).then(res => res.json()).then(groups => {
    const group = groups.find(g => g.id === parseInt(id));
    if (group) {
      document.getElementById('group-title').textContent = group.name;
      const feed = document.getElementById('group-feed');
      feed.innerHTML = '';
      group.posts.forEach(post => {
        const div = document.createElement('div');
        div.className = 'post';
        div.innerHTML = `<p>${post.content}</p>
          <button onclick="likeGroupPost(\( {id}, \){post.id})">Like (${post.likes.length})</button>
          <textarea id="comment-${post.id}"></textarea>
          <button onclick="commentGroupPost(\( {id}, \){post.id})">Comment</button>
          <div>\( {post.comments.map(c => `<p> \){c.text}</p>`).join('')}</div>`;
        feed.appendChild(div);
      });
    }
  });
}

// إنشاء منشور في مجموعة
function createGroupPost() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  const content = document.getElementById('new-group-post').value;
  fetch(`\( {API}/groups/ \){id}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content })
  }).then(() => loadGroup());
}

// إعجاب منشور في مجموعة (أضف روت مشابه في server.js إذا لزم)
function likeGroupPost(groupId, postId) {
  // مشابه لـ likePost، لكن للمجموعات - أضف endpoint في server.js
}

// تعليق في مجموعة (مثل أعلاه)
function commentGroupPost(groupId, postId) {
  // مشابه لـ commentPost
}

// أضف endpoints إضافية في server.js لإعجاب/تعليق في المجموعات، مشابهة للمنشورات الرئيسية.
