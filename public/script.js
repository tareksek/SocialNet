
const API_BASE = 'http://localhost:3000/api'; // غير إلى URL Render

let token = localStorage.getItem('token');

// تسجيل
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('regUsername').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const bio = document.getElementById('regBio').value;
  
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, bio, password })
  });
  const data = await res.json();
  if (data.error) alert(data.error);
  else alert('تم التسجيل! قم بتسجيل الدخول.');
});

// تسجيل دخول
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.error) alert(data.error);
  else {
    token = data.token;
    localStorage.setItem('token', token);
    alert('تم الدخول! مرحبا ' + data.user.username);
    loadFeed();
  }
});

// تحميل تغذية (مع token إذا موجود)
async function loadFeed() {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_BASE}/feed`, { headers });
  const users = await res.json();
  const feed = document.getElementById('feed');
  feed.innerHTML = users.map(u => `
    <div class="user-card">
      <h3>${u.username}</h3>
      <p>${u.bio || 'لا نبذة'}</p>
      <small>${new Date(u.created_at).toLocaleString('ar')}</small>
      <button onclick="loadProfile(${u.id})">عرض الملف</button>
    </div>
  `).join('');
}

// عرض ملف (مع تحقق)
async function loadProfile(id) {
  const headers = { Authorization: `Bearer ${token}` };
  const res = await fetch(`\( {API_BASE}/profile/ \){id}`, { headers });
  const profile = await res.json();
  const status = document.getElementById('status');
  status.innerHTML = profile.error ? `<p style="color:red;">${profile.error}</p>` : `
    <div class="user-card">
      <h3>${profile.username}</h3>
      <p>${profile.bio || 'لا نبذة'}</p>
    </div>
  `;
  document.getElementById('profile').innerHTML = status.innerHTML;
}

// تحميل أولي
loadFeed();
