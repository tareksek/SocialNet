// public/js/feed.js
import { sanitizeForDisplay } from './utils.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 🔐 تحقق من تسجيل الدخول
  const storedUser = localStorage.getItem('user');
  const token = localStorage.getItem('token');

  if (!storedUser || !token) {
    alert('الرجاء تسجيل الدخول أولاً.');
    window.location.href = '/login';
    return;
  }

  try {
    currentUser = JSON.parse(storedUser);
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userDisplayName').textContent = currentUser.username;
    document.getElementById('modalUserName').textContent = currentUser.username;
  } catch (e) {
    localStorage.clear();
    window.location.href = '/login';
    return;
  }

  // 📥 تحميل المنشورات
  await loadPosts();

  // ✏️ ربط أزرار النافذة المنبثقة
  document.getElementById('postTrigger').addEventListener('click', openPostModal);
  document.getElementById('closeModal').addEventListener('click', closePostModal);
  document.getElementById('modalOverlay').addEventListener('click', closePostModal);
  document.getElementById('cancelPost').addEventListener('click', closePostModal);
  document.getElementById('publishPost').addEventListener('click', handlePublish);
});

// فتح نافذة النشر
function openPostModal() {
  document.getElementById('postModal').style.display = 'block';
  document.getElementById('postContent').focus();
}

// إغلاق النافذة
function closePostModal() {
  document.getElementById('postModal').style.display = 'none';
  document.getElementById('postContent').value = '';
}

// نشر المنشور
async function handlePublish() {
  const content = document.getElementById('postContent').value.trim();
  if (!content) {
    alert('الرجاء كتابة محتوى المنشور.');
    return;
  }

  try {
    const cleanContent = sanitizeForDisplay(content);
    
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        content: cleanContent
      })
    });

    if (res.ok) {
      closePostModal();
      await loadPosts(); // إعادة تحميل المنشورات
    } else {
      const err = await res.json();
      alert('فشل النشر: ' + (err.error || 'حدث خطأ'));
    }
  } catch (err) {
    alert('فشل الاتصال بالخادم.');
  }
}

// تحميل وعرض المنشورات
async function loadPosts() {
  const loader = document.getElementById('feedLoader');
  const container = document.getElementById('feedContainer');
  
  loader.style.display = 'block';
  container.innerHTML = '';

  try {
    const res = await fetch('/api/posts');
    const posts = await res.json();

    loader.style.display = 'none';

    if (posts.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div style="font-size:48px;margin-bottom:16px">📰</div>
          <h3>لا توجد منشورات حتى الآن</h3>
          <p>ابدأ بنشر أول منشور لك!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = posts.map(post => `
      <div class="post">
        <div class="post-header">
          <img src="https://via.placeholder.com/40/1877f2/ffffff?text=${post.username.charAt(0)}" 
               alt="${post.username}" class="post-avatar" />
          <div class="post-info">
            <div class="post-username">${post.username}</div>
            <div class="post-time">${formatTime(post.timestamp)}</div>
          </div>
        </div>
        <div class="post-actions-bar">
          <div class="post-action">👍 أعجبني</div>
          <div class="post-action">💬 علّق</div>
          <div class="post-action">↪️ شارك</div>
        </div>
        <div class="post-content">${post.content}</div>
      </div>
    `).join('');
  } catch (err) {
    loader.style.display = 'none';
    container.innerHTML = `
      <div class="error-state">
        <p style="color:#e22121">❌ فشل تحميل المنشورات. حاول مجددًا لاحقًا.</p>
      </div>
    `;
  }
}

// تنسيق الوقت (مثال: "منذ 5 دقائق")
function formatTime(isoString) {
  const now = new Date();
  const postTime = new Date(isoString);
  const diffMs = now - postTime;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 0) return `${diffDay} يوم${diffDay > 1 ? 'ين' : ''}`;
  if (diffHr > 0) return `${diffHr} ساعة${diffHr > 1 ? 'ين' : ''}`;
  if (diffMin > 0) return `منذ ${diffMin} دقيقة${diffMin > 1 ? 'ين' : ''}`;
  return 'الآن';
}
