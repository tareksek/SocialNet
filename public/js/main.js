// دالة مساعدة للـ fetch
const api = async (url, options = {}) => {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  return res.json();
};

// تسجيل الدخول والتسجيل
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    const res = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.success) location.href = res.redirect;
    else document.getElementById('error').textContent = res.message;
  };
}

if (document.getElementById('registerForm')) {
  document.getElementById('registerForm').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    if (data.password !== data.confirmPassword) {
      document.getElementById('error').textContent = "كلمتا المرور غير متطابقتين";
      return;
    }
    const res = await api('/api/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.success) location.href = res.redirect;
    else document.getElementById('error').textContent = res.message;
  };
}

// الصفحة الرئيسية
if (document.getElementById('postsContainer')) {
  const postsContainer = document.getElementById('postsContainer');
  const usernameSpan = document.getElementById('username');

  // جلب اسم المستخدم
  fetch('/api/posts').then(r => r.json()).then(posts => {
    if (posts.error) location.href = '/index.html';
    usernameSpan.textContent = posts[0] ? posts[0].authorName : 'مستخدم';
  });

  // جلب المنشورات
  const loadPosts = async () => {
    const posts = await api('/api/posts');
    postsContainer.innerHTML = posts.map(post => `
      <div class="card post">
        <div class="post-header">
          <img src="${post.authorAvatar}" class="avatar">
          <div>
            <h3>${post.authorName}</h3>
            <small>${new Date(post.createdAt).toLocaleString('ar-EG')}</small>
          </div>
        </div>
        <p>${post.content}</p>
        ${post.image ? `<img src="${post.image}" class="post-image">` : ''}
        <div class="post-footer">
          <button class="like-btn ${post.isLiked ? 'liked' : ''}">
            إعجاب (${post.likesCount || 0})
          </button>
        </div>
      </div>
    `).join('');
  };

  // إنشاء منشور
  document.getElementById('postForm').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('content', document.getElementById('postContent').value);
    const image = document.getElementById('postImage').files[0];
    if (image) formData.append('image', image);

    await fetch('/api/post', { method: 'POST', body: formData });
    document.getElementById('postForm').reset();
    loadPosts();
  };

  // تسجيل الخروج
  document.getElementById('logout').onclick = async (e) => {
    e.preventDefault();
    await api('/api/logout');
    location.href = '/login.html';
  };

  loadPosts();
}
