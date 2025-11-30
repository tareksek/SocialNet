// public/js/main.js – نسخة يدوية فقط (لا تحديث تلقائي أبدًا)

const postsContainer = document.getElementById('postsContainer');
const usernameSpan   = document.getElementById('username');
const logoutBtn      = document.getElementById('logout');

// جلب المنشورات (مرة واحدة أو عند الضغط على زر)
async function loadPosts() {
  try {
    const res = await fetch('/api/posts');
    if (res.status === 401) {
      location.href = '/login.html';
      return;
    }
    const posts = await res.json();

    // عرض اسم المستخدم في الهيدر
    if (posts.length > 0) {
      usernameSpan.textContent = posts[0].authorName || 'مستخدم';
    }

    // عرض المنشورات
    postsContainer.innerHTML = posts.map(post => `
      <div class="card post">
        <div class="post-header">
          <img src="${post.authorAvatar}" class="avatar" alt="avatar">
          <div>
            <h3>${post.authorName}</h3>
            <small>${new Date(post.createdAt).toLocaleString('ar-EG')}</small>
          </div>
        </div>
        <p>${post.content.replace(/\n/g, '<br)}</p>
        ${post.image ? `<img src="${post.image}" class="post-image" alt="صورة">` : ''}
        <div class="post-footer">
          <button class="like-btn ${post.isLiked ? 'liked' : ''}">
            إعجاب (${post.likesCount || 0})
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error(err);
  }
}

// إنشاء منشور جديد
document.getElementById('postForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData();
  const content = document.getElementById('postContent').value.trim();
  const image   = document.getElementById('postImage').files[0];

  if (!content && !image) return;

  if (content) formData.append('content', content);
  if (image)   formData.append('image', image);

  await fetch('/api/post', {
    method: 'POST',
    body: formData
  });

  document.getElementById('postForm').reset();
  loadPosts(); // تحديث يدوي بعد النشر
});

// تسجيل الخروج
logoutBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/logout');
  location.href = '/login.html';
});

// تحميل المنشورات مرة واحدة فقط عند فتح الصفحة
loadPosts();
