// public/js/main.js – النسخة النهائية الكاملة (تسجيل دخول + إنشاء حساب + منشورات + بدون refresh)

const postsContainer = document.getElementById('postsContainer');
const postForm = document.getElementById('postForm');
const postContent = document.getElementById('postContent');
const postImage = document.getElementById('postImage');
const usernameSpan = document.getElementById('username');
const logoutBtn = document.getElementById('logout');

// ==================== تسجيل الدخول وإنشاء حساب (بدون refresh) ====================
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (data.success) {
        window.location.href = '/index.html;
      } else {
        alert(data.message || 'بيانات الدخول غير صحيحة');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = document.getElementById('registerName').value.trim();
      const email = document.getElementById('registerEmail').value.trim();
      const password = document.getElementById('registerPassword').value;
      const confirmPassword = document.getElementById('registerConfirm').value;

      if (password !== confirmPassword) {
        return alert('كلمتا المرور غير متطابقتين');
      }

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      });

      const data = await res.json();
      if (data.success) {
        window.location.href = '/index.html;
      } else {
        alert(data.message || 'فشل إنشاء الحساب');
      }
    });
  }

  // ==================== تحميل المنشورات (إذا كنا في الصفحة الرئيسية) ====================
  if (postsContainer) {
    loadPosts();
  }

  // ==================== إنشاء منشور جديد ====================
  if (postForm) {
    postForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = postContent.value.trim();
      const image = postImage.files[0];

      if (!content && !image) return alert('اكتب شيئًا أو ارفع صورة');

      const formData = new FormData();
      if (content) formData.append('content', content);
      if (image) formData.append('image', image);

      const res = await fetch('/api/post', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.success) {
        postForm.reset();
        loadPosts(); // تحديث يدوي بعد النشر
      } else {
        alert('فشل إنشاء المنشور');
      }
    });
  }

  // ==================== تسجيل الخروج ====================
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch('/api/logout');
      window.location.href = '/login.html';
    });
  }
});

// ==================== جلب وعرض المنشورات ====================
async function loadPosts() {
  try {
    const res = await fetch('/api/posts');
    if (res.status === 401) {
      window.location.href = '/login.html';
      return;
    }
    const posts = await res.json();

    if (usernameSpan && posts.length > 0) {
      usernameSpan.textContent = posts[0].authorName || 'مستخدم';
    }

    postsContainer.innerHTML = posts.map(post => `
      <div class="card post">
        <div class="post-header">
          <img src="${post.authorAvatar}" class="avatar" alt="avatar">
          <div>
            <h3>${post.authorName}</h3>
            <small>${new Date(post.createdAt).toLocaleString('ar-EG')}</small>
          </div>
        </div>
        <p>${post.content.replace(/\n/g, '<br>')}</p>
        ${post.image ? `<img src="${post.image}" class="post-image" alt="صورة">` : ''}
        <div class="post-footer">
          <button class="like-btn">إعجاب (0)</button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('خطأ في تحميل المنشورات:', err);
  }
}
