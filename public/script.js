let currentUser = null;

// إظهار نموذج التسجيل
function showRegister() {
  document.getElementById('registerForm').style.display = 'block';
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('postForm').style.display = 'none';
}

// إظهار نموذج الدخول
function showLogin() {
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('postForm').style.display = 'none';
}

// التسجيل
async function register() {
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password })
  });

  const data = await res.json();
  if (res.ok) {
    alert('تم التسجيل بنجاح! يُرجى تسجيل الدخول.');
    showLogin();
  } else {
    alert('خطأ: ' + (data.error || 'حدث خطأ'));
  }
}

// تسجيل الدخول
async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (res.ok) {
    currentUser = data.user;
    document.getElementById('authButtons').style.display = 'none';
    document.getElementById('userPanel').style.display = 'block';
    document.getElementById('welcomeMsg').textContent = `مرحبًا، ${currentUser.username}`;
    document.getElementById('postForm').style.display = 'block';
    loadPosts();
  } else {
    alert('خطأ: ' + (data.error || 'بيانات خاطئة'));
  }
}

// تسجيل الخروج
function logout() {
  currentUser = null;
  document.getElementById('authButtons').style.display = 'block';
  document.getElementById('userPanel').style.display = 'none';
  document.getElementById('postForm').style.display = 'none';
  document.getElementById('postsList').innerHTML = '';
}

// نشر مشاركة
async function createPost() {
  const content = document.getElementById('postContent').value.trim();
  if (!content) return alert('الرجاء كتابة محتوى المشاركة');

  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser.id, content })
  });

  if (res.ok) {
    document.getElementById('postContent').value = '';
    loadPosts();
  } else {
    alert('فشل النشر');
  }
}

// جلب المشاركات
async function loadPosts() {
  const res = await fetch('/api/posts');
  const posts = await res.json();

  const list = document.getElementById('postsList');
  list.innerHTML = posts.map(p => `
    <div class="post">
      <div class="post-header">${p.username}</div>
      <div class="post-time">${new Date(p.timestamp).toLocaleString('ar-EG')}</div>
      <div class="post-content">${p.content}</div>
    </div>
  `).join('');
}

// عند التحميل: عرض نموذج الدخول افتراضيًا
document.addEventListener('DOMContentLoaded', () => {
  showLogin();
});
