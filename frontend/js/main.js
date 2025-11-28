// تكوين التطبيق
const CONFIG = {
    API_BASE_URL: window.location.origin + '/api',
    SOCKET_URL: window.location.origin,
    UPLOADS_URL: window.location.origin + '/uploads'
};

// حالة التطبيق
let appState = {
    currentUser: null,
    currentTab: 'home',
    posts: [],
    friends: [],
    notifications: [],
    conversations: [],
    currentConversation: null,
    socket: null
};

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    await checkAuth();
    setupEventListeners();
    loadInitialData();
    initializeSocket();
}

// التحقق من المصادقة
async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('غير مصرح');
        }

        const data = await response.json();
        appState.currentUser = data.user;
        updateUI();
    } catch (error) {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    }
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // التنقل بين التبويبات
    document.querySelectorAll('[data-tab]').forEach(element => {
        element.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // القائمة المنسدلة للمستخدم
    document.getElementById('userMenu').addEventListener('click', function() {
        document.getElementById('dropdownMenu').classList.toggle('show');
    });

    // إغلاق القوائم المنسدلة بالنقر خارجها
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.user-menu')) {
            document.getElementById('dropdownMenu').classList.remove('show');
        }
    });

    // إنشاء المنشورات
    document.getElementById('submitPost').addEventListener('click', createPost);
    document.getElementById('postContent').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            createPost();
        }
    });

    // تحميل الصور
    document.querySelectorAll('[data-type="photo"]').forEach(btn => {
        btn.addEventListener('click', () => document.getElementById('imageUpload').click());
    });

    document.getElementById('imageUpload').addEventListener('change', handleImageUpload);
}

// تبديل التبويبات
function switchTab(tabName) {
    appState.currentTab = tabName;
    
    // تحديث التبويب النشط
    document.querySelectorAll('.nav-icon').forEach(icon => {
        icon.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // تحميل محتوى التبويب
    loadTabContent(tabName);
}

// تحميل محتوى التبويب
async function loadTabContent(tabName) {
    const mainContent = document.getElementById('mainContent');
    
    switch (tabName) {
        case 'home':
            await loadHomeFeed();
            break;
        case 'profile':
            await loadUserProfile();
            break;
        case 'friends':
            await loadFriendsPage();
            break;
        case 'messages':
            await loadMessagesPage();
            break;
        case 'notifications':
            await loadNotificationsPage();
            break;
    }
}

// تحميل الصفحة الرئيسية
async function loadHomeFeed() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/posts`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            appState.posts = data.posts;
            renderPosts();
        }
    } catch (error) {
        showNotification('خطأ في تحميل المنشورات', 'error');
    }
}

// عرض المنشورات
function renderPosts() {
    const container = document.getElementById('postsContainer');
    
    if (appState.posts.length === 0) {
        container.innerHTML = `
            <div class="post-card text-center">
                <p>لا توجد منشورات لعرضها</p>
                <p>كن أول من ينشر!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = appState.posts.map(post => `
        <div class="post-card fade-in" data-post-id="${post._id}">
            <div class="post-header">
                <div class="user-avatar">
                    ${post.user.profilePicture ? 
                        `<img src="${CONFIG.UPLOADS_URL}/${post.user.profilePicture}" alt="${post.user.firstName}">` :
                        post.user.firstName.charAt(0)
                    }
                </div>
                <div class="post-user-info">
                    <h4>${post.user.firstName} ${post.user.lastName}</h4>
                    <div class="post-time">${formatTime(post.createdAt)}</div>
                </div>
            </div>
            
            <div class="post-content">
                ${post.content}
            </div>
            
            ${post.images && post.images.length > 0 ? `
                <img src="${CONFIG.UPLOADS_URL}/${post.images[0].url}" class="post-image" alt="صورة المنشور">
            ` : ''}
            
            <div class="post-stats">
                <span>${post.likesCount || 0} إعجاب</span>
                <span>${post.commentsCount || 0} تعليق</span>
            </div>
            
            <div class="post-actions-buttons">
                <button class="post-action-button like-btn ${post.likes.find(like => like.user === appState.currentUser._id) ? 'liked' : ''}" 
                        onclick="toggleLike('${post._id}')">
                    <i class="fas fa-thumbs-up"></i>
                    <span>إعجاب</span>
                </button>
                <button class="post-action-button" onclick="focusComment('${post._id}')">
                    <i class="fas fa-comment"></i>
                    <span>تعليق</span>
                </button>
                <button class="post-action-button">
                    <i class="fas fa-share"></i>
                    <span>مشاركة</span>
                </button>
            </div>
            
            <div class="comments-section">
                ${post.comments && post.comments.length > 0 ? post.comments.map(comment => `
                    <div class="comment">
                        <div class="user-avatar small">
                            ${comment.user.profilePicture ? 
                                `<img src="${CONFIG.UPLOADS_URL}/${comment.user.profilePicture}" alt="${comment.user.firstName}">` :
                                comment.user.firstName.charAt(0)
                            }
                        </div>
                        <div class="comment-content">
                            <div class="comment-header">
                                <span class="comment-author">${comment.user.firstName} ${comment.user.lastName}</span>
                                <span class="comment-time">${formatTime(comment.createdAt)}</span>
                            </div>
                            <div class="comment-text">${comment.content}</div>
                        </div>
                    </div>
                `).join('') : ''}
                
                <div class="add-comment">
                    <div class="user-avatar small">
                        ${appState.currentUser.profilePicture ? 
                            `<img src="${CONFIG.UPLOADS_URL}/${appState.currentUser.profilePicture}" alt="${appState.currentUser.firstName}">` :
                            appState.currentUser.firstName.charAt(0)
                        }
                    </div>
                    <input type="text" id="comment-${post._id}" placeholder="اكتب تعليقاً...">
                    <button onclick="addComment('${post._id}')">نشر</button>
                </div>
            </div>
        </div>
    `).join('');
}

// إنشاء منشور جديد
async function createPost() {
    const content = document.getElementById('postContent').value.trim();
    const imageFile = document.getElementById('imageUpload').files[0];

    if (!content && !imageFile) {
        showNotification('يرجى إدخال محتوى أو اختيار صورة', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('content', content);
    
    if (imageFile) {
        formData.append('media', imageFile);
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/posts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });

        if (response.ok) {
            document.getElementById('postContent').value = '';
            document.getElementById('imageUpload').value = '';
            showNotification('تم نشر المنشور بنجاح', 'success');
            loadHomeFeed(); // إعادة تحميل المنشورات
        } else {
            throw new Error('فشل في نشر المنشور');
        }
    } catch (error) {
        showNotification('خطأ في نشر المنشور', 'error');
    }
}

// التعامل مع رفع الصور
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        // يمكن إضافة معاينة للصورة هنا
        document.getElementById('submitPost').click();
    }
}

// الإعجاب بالمنشورات
async function toggleLike(postId) {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            loadHomeFeed(); // إعادة تحميل المنشورات
        }
    } catch (error) {
        showNotification('خطأ في الإعجاب', 'error');
    }
}

// إضافة تعليق
async function addComment(postId) {
    const commentInput = document.getElementById(`comment-${postId}`);
    const content = commentInput.value.trim();

    if (!content) {
        showNotification('يرجى إدخال نص التعليق', 'error');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/posts/${postId}/comment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });

        if (response.ok) {
            commentInput.value = '';
            loadHomeFeed(); // إعادة تحميل المنشورات
        }
    } catch (error) {
        showNotification('خطأ في إضافة التعليق', 'error');
    }
}

function focusComment(postId) {
    const commentInput = document.getElementById(`comment-${postId}`);
    commentInput.focus();
}

// تحديث واجهة المستخدم
function updateUI() {
    if (appState.currentUser) {
        // تحديث اسم المستخدم
        document.getElementById('userName').textContent = 
            `${appState.currentUser.firstName} ${appState.currentUser.lastName}`;
        
        document.getElementById('sidebarName').textContent = 
            `${appState.currentUser.firstName} ${appState.currentUser.lastName}`;

        // تحديث الصورة
        if (appState.currentUser.profilePicture) {
            const avatarUrl = `${CONFIG.UPLOADS_URL}/${appState.currentUser.profilePicture}`;
            document.querySelectorAll('.user-avatar').forEach(avatar => {
                avatar.innerHTML = `<img src="${avatarUrl}" alt="${appState.currentUser.firstName}">`;
            });
        }
    }
}

// تهيئة Socket.io
function initializeSocket() {
    appState.socket = io(CONFIG.SOCKET_URL);
    
    appState.socket.on('connect', () => {
        console.log('Connected to server');
        appState.socket.emit('join-user', appState.currentUser._id);
    });

    appState.socket.on('receive-message', (data) => {
        handleReceivedMessage(data);
    });

    appState.socket.on('new-post-notification', (data) => {
        showNotification(`منشور جديد من ${data.userName}`, 'info');
    });
}

// التعامل مع الرسائل الواردة
function handleReceivedMessage(data) {
    if (appState.currentConversation && 
        appState.currentConversation._id === data.conversation) {
        // إضافة الرسالة إلى المحادثة الحالية
        addMessageToChat(data);
    } else {
        // إشعار برسالة جديدة
        showNotification(`رسالة جديدة من ${data.senderName}`, 'info');
        updateMessageBadge();
    }
}

// أدوات مساعدة
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    if (days < 7) return `منذ ${days} يوم`;
    
    return date.toLocaleDateString('ar-SA');
}

function showNotification(message, type = 'info') {
    // تنفيذ بسيط للإشعارات
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        left: 20px;
        background: ${type === 'error' ? '#fa383e' : type === 'success' ? '#42b72a' : '#1877f2'};
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        z-index: 10000;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function updateMessageBadge() {
    // تحديث عداد الرسائل غير المقروءة
    const badge = document.getElementById('messageBadge');
    const currentCount = parseInt(badge.textContent) || 0;
    badge.textContent = currentCount + 1;
}

// تسجيل الخروج
document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.removeItem('token');
    window.location.href = '/login.html';
});