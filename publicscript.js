const API_BASE = 'http://localhost:3000/api'; // في Render: استخدم الـURL العام

// تسجيل
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const bio = document.getElementById('bio').value;
  
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, bio })
  });
  const data = await res.json();
  if (data.error) alert(data.error);
  else {
    alert('تم التسجيل! ID: ' + data.id);
    loadFeed();
  }
});

// تحميل التغذية
async function loadFeed() {
  const res = await fetch(`${API_BASE}/feed`);
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

// عرض الملف الشخصي
async function loadProfile(id) {
  const res = await fetch(`\( {API_BASE}/profile/ \){id}`);
  const profile = await res.json();
  document.getElementById('profile').innerHTML = `
    <div class="user-card">
      <h3>${profile.username}</h3>
      <p>${profile.email}</p>
      <p>${profile.bio || 'لا نبذة'}</p>
    </div>
  `;
}

// تحميل أولي
loadFeed();
