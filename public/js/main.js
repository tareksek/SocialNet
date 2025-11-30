
// public/js/main.js – النسخة المتقدمة مع جميع المميزات
class ConnectlyApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 1;
        this.hasMorePosts = true;
        this.isLoading = false;
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadInitialData();
    }

    // ==================== إدارة المصادقة ====================
    async checkAuth() {
        try {
            const res = await fetch('/api/posts?limit=1');
            if (res.status === 401) {
                if (!window.location.pathname.includes('login.html') && 
                    !window.location.pathname.includes('register.html')) {
                    window.location.href = '/login.html';
                }
                return;
            }
            
            if (res.ok && window.location.pathname.includes('login.html')) {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('خطأ في التحقق من المصادقة:', error);
        }
    }

    // ==================== إعداد المستمعين للأحداث ====================
    setupEventListeners() {
        this.setupAuthForms();
        this.setupPostForm();
        this.setupInfiniteScroll();
        this.setupLogout();
    }

    setupAuthForms() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    setupPostForm() {
        const postForm = document.getElementById('postForm');
        const postImage = document.getElementById('postImage');
        const imagePreview = document.getElementById('imagePreview');

        if (postForm) {
            postForm.addEventListener('submit', (e) => this.handleCreatePost(e));
        }

        if (postImage && imagePreview) {
            postImage.addEventListener('change', (e) => this.handleImagePreview(e, imagePreview));
        }
    }

    setupInfiniteScroll() {
        window.addEventListener('scroll', () => {
            if (this.isLoading || !this.hasMorePosts) return;

            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            if (scrollTop + clientHeight >= scrollHeight - 100) {
                this.loadMorePosts();
            }
        });
    }

    setupLogout() {
        const logoutBtn = document.getElementById('logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    // ==================== معالجة النماذج ====================
    async handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;

        try {
            this.setButtonLoading(submitBtn, true, 'جاري تسجيل الدخول...');

            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (result.success) {
                this.showNotification('تم تسجيل الدخول بنجاح!', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                this.showNotification(result.message || 'بيانات الدخول غير صحيحة', 'error');
            }
        } catch (error) {
            this.showNotification('حدث خطأ في الخادم', 'error');
        } finally {
            this.setButtonLoading(submitBtn, false, originalText);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        const password = form.querySelector('#registerPassword').value;
        const confirmPassword = form.querySelector('#registerConfirm').value;

        if (password !== confirmPassword) {
            this.showNotification('كلمتا المرور غير متطابقتين', 'error');
            return;
        }

        try {
            this.setButtonLoading(submitBtn, true, 'جاري إنشاء الحساب...');

            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (result.success) {
                this.showNotification('تم إنشاء الحساب بنجاح!', 'success');
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                this.showNotification(result.message || 'فشل إنشاء الحساب', 'error');
            }
        } catch (error) {
            this.showNotification('حدث خطأ في الخادم', 'error');
        } finally {
            this.setButtonLoading(submitBtn, false, originalText);
        }
    }

    async handleCreatePost(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const postContent = document.getElementById('postContent');
        const postImage = document.getElementById('postImage');

        if (!postContent.value.trim() && !postImage.files[0]) {
            this.showNotification('اكتب شيئًا أو ارفع صورة', 'warning');
            return;
        }

        try {
            this.setButtonLoading(submitBtn, true, 'جاري النشر...');

            const formData = new FormData();
            if (postContent.value.trim()) {
                formData.append('content', postContent.value.trim());
            }
            if (postImage.files[0]) {
                formData.append('image', postImage.files[0]);
            }

            const res = await fetch('/api/posts', {
                method: 'POST',
                body: formData
            });

            const result = await res.json();

            if (result.success) {
                this.showNotification('تم نشر المنشور بنجاح!', 'success');
                form.reset();
                this.hideImagePreview();
                this.loadPosts(true); // إعادة تحميل المنشورات
            } else {
                this.showNotification(result.error || 'فشل نشر المنشور', 'error');
            }
        } catch (error) {
            this.showNotification('حدث خطأ في الخادم', 'error');
        } finally {
            this.setButtonLoading(submitBtn, false, 'نشر');
        }
    }

    // ==================== إدارة المنشورات ====================
    async loadInitialData() {
        if (document.getElementById('postsContainer')) {
            await this.loadPosts();
            this.updateUserInfo();
        }
    }

    async loadPosts(refresh = false) {
        if (this.isLoading) return;

        if (refresh) {
            this.currentPage = 1;
            this.hasMorePosts = true;
            document.getElementById('postsContainer').innerHTML = '';
        }

        this.isLoading = true;
        this.showLoadingIndicator();

        try {
            const res = await fetch(`/api/posts?page=${this.currentPage}&limit=10`);
            
            if (res.status === 401) {
                window.location.href = '/login.html';
                return;
            }

            const result = await res.json();

            if (result.success) {
                this.displayPosts(result.posts, refresh);
                this.hasMorePosts = result.pagination.hasMore;
                this.currentPage++;
            } else {
                this.showNotification('فشل تحميل المنشورات', 'error');
            }
        } catch (error) {
            this.showNotification('حدث خطأ في تحميل المنشورات', 'error');
        } finally {
            this.isLoading = false;
            this.hideLoadingIndicator();
        }
    }

    async loadMorePosts() {
        if (!this.isLoading && this.hasMorePosts) {
            await this.loadPosts();
        }
    }

    displayPosts(posts, clear = false) {
        const container = document.getElementById('postsContainer');
        
        if (clear) {
            container.innerHTML = '';
        }

        if (posts.length === 0 && clear) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-newspaper"></i>
                    <h3>لا توجد منشورات بعد</h3>
                    <p>كن أول من ينشر على Connectly!</p>
                </div>
            `;
            return;
        }

        posts.forEach(post => {
            const postElement = this.createPostElement(post);
            container.appendChild(postElement);
        });
    }

    createPostElement(post) {
        const postDiv = document.createElement('div');
        postDiv.className = 'card post';
        postDiv.innerHTML = `
            <div class="post-header">
                <img src="${post.authorAvatar}" class="avatar" alt="صورة ${post.authorName}" onerror="this.src='/images/default-avatar.png'">
                <div class="post-user-info">
                    <h3>${this.escapeHtml(post.authorName)}</h3>
                    <small>${this.formatDate(post.createdAt)}</small>
                </div>
                ${post.authorId === (this.currentUser?.id) ? `
                    <button class="post-options-btn" onclick="app.handlePostOptions('${post.id}')">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                ` : ''}
            </div>
            
            <div class="post-content">
                ${post.content ? `<p>${this.formatPostContent(post.content)}</p>` : ''}
                ${post.image ? `<img src="${post.image}" class="post-image" alt="صورة المنشور" loading="lazy">` : ''}
            </div>
            
            <div class="post-stats">
                <span class="likes-count">${post.likesCount} إعجاب</span>
                <span class="comments-count">${post.commentsCount} تعليق</span>
            </div>
            
            <div class="post-actions">
                <button class="action-btn like-btn ${post.isLiked ? 'liked' : ''}" onclick="app.handleLike('${post.id}')">
                    <i class="fas fa-heart"></i>
                    <span>${post.isLiked ? 'معجب به' : 'إعجاب'}</span>
                </button>
                <button class="action-btn comment-btn" onclick="app.toggleComments('${post.id}')">
                    <i class="fas fa-comment"></i>
                    <span>تعليق</span>
                </button>
            </div>
            
            <div class="comments-section" id="comments-${post.id}" style="display: none;">
                <div class="add-comment">
                    <input type="text" id="comment-input-${post.id}" placeholder="اكتب تعليقاً..." 
                           onkeypress="if(event.key === 'Enter') app.handleComment('${post.id}')">
                    <button onclick="app.handleComment('${post.id}')">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
                <div class="comments-list" id="comments-list-${post.id}"></div>
            </div>
        `;

        return postDiv;
    }

    // ==================== التفاعلات ====================
    async handleLike(postId) {
        try {
            const likeBtn = document.querySelector(`.like-btn[onclick="app.handleLike('${postId}')"]`);
            const likesCountEl = likeBtn.closest('.post').querySelector('.likes-count');
            
            likeBtn.disabled = true;

            const res = await fetch(`/api/posts/${postId}/like`, {
                method: 'POST'
            });

            const result = await res.json();

            if (result.success) {
                likeBtn.classList.toggle('liked');
                likeBtn.innerHTML = `
                    <i class="fas fa-heart"></i>
                    <span>${result.isLiked ? 'معجب به' : 'إعجاب'}</span>
                `;
                likesCountEl.textContent = `${result.likesCount} إعجاب`;
            }
        } catch (error) {
            this.showNotification('فشل تحديث الإعجاب', 'error');
        } finally {
            likeBtn.disabled = false;
        }
    }

    async handleComment(postId) {
        const commentInput = document.getElementById(`comment-input-${postId}`);
        const content = commentInput.value.trim();

        if (!content) return;

        try {
            commentInput.disabled = true;

            const res = await fetch(`/api/posts/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });

            const result = await res.json();

            if (result.success) {
                commentInput.value = '';
                this.addCommentToPost(postId, result.comment);
                this.updateCommentsCount(postId, 1);
            } else {
                this.showNotification('فشل إضافة التعليق', 'error');
            }
        } catch (error) {
            this.showNotification('حدث خطأ في إضافة التعليق', 'error');
        } finally {
            commentInput.disabled = false;
        }
    }

    async toggleComments(postId) {
        const commentsSection = document.getElementById(`comments-${postId}`);
        const commentsList = document.getElementById(`comments-list-${postId}`);

        if (commentsSection.style.display === 'none') {
            commentsSection.style.display = 'block';
            await this.loadComments(postId, commentsList);
        } else {
            commentsSection.style.display = 'none';
        }
    }

    async loadComments(postId, container) {
        try {
            const res = await fetch(`/api/posts/${postId}/comments`);
            const result = await res.json();

            if (result.success) {
                container.innerHTML = result.comments.map(comment => `
                    <div class="comment">
                        <img src="${comment.authorAvatar}" class="comment-avatar" alt="صورة ${comment.authorName}">
                        <div class="comment-content">
                            <strong>${this.escapeHtml(comment.authorName)}</strong>
                            <p>${this.escapeHtml(comment.content)}</p>
                            <small>${this.formatDate(comment.createdAt)}</small>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    // ==================== أدوات مساعدة ====================
    addCommentToPost(postId, comment) {
        const commentsList = document.getElementById(`comments-list-${postId}`);
        const commentElement = document.createElement('div');
        commentElement.className = 'comment';
        commentElement.innerHTML = `
            <img src="${comment.authorAvatar}" class="comment-avatar" alt="صورة ${comment.authorName}">
            <div class="comment-content">
                <strong>${this.escapeHtml(comment.authorName)}</strong>
                <p>${this.escapeHtml(comment.content)}</p>
                <small>${this.formatDate(comment.createdAt)}</small>
            </div>
        `;
        commentsList.prepend(commentElement);
    }

    updateCommentsCount(postId, change) {
        const commentsCountEl = document.querySelector(`#comments-${postId}`).closest('.post').querySelector('.comments-count');
        const currentCount = parseInt(commentsCountEl.textContent) || 0;
        commentsCountEl.textContent = `${currentCount + change} تعليق`;
    }

    handleImagePreview(event, previewContainer) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewContainer.innerHTML = `
                    <div class="image-preview">
                        <img src="${e.target.result}" alt="معاينة الصورة">
                        <button type="button" class="remove-image" onclick="app.hideImagePreview()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `;
                previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    }

    hideImagePreview() {
        const previewContainer = document.getElementById('imagePreview');
        const postImage = document.getElementById('postImage');
        
        if (previewContainer) {
            previewContainer.style.display = 'none';
            previewContainer.innerHTML = '';
        }
        
        if (postImage) {
            postImage.value = '';
        }
    }

    async handleLogout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Error logging out:', error);
        }
    }

    handlePostOptions(postId) {
        // يمكن إضافة قائمة خيارات للمنشور (حذف، تعديل، إلخ)
        this.showNotification('قائمة الخيارات قريباً!', 'info');
    }

    // ==================== أدوات العرض ====================
    updateUserInfo() {
        const usernameSpan = document.getElementById('username');
        const userAvatar = document.getElementById('userAvatar');
        
        // سيتم تحديث هذه المعلومات من الـ API
        if (usernameSpan) {
            usernameSpan.textContent = 'مستخدم';
        }
    }

    showNotification(message, type = 'info') {
        // إنشاء عنصر الإشعار
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // إضافة الأنماط إذا لم تكن موجودة
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    border-radius: 8px;
                    color: white;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    max-width: 400px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    animation: slideIn 0.3s ease;
                }
                .notification.success { background: #28a745; }
                .notification.error { background: #dc3545; }
                .notification.warning { background: #ffc107; color: #000; }
                .notification.info { background: #17a2b8; }
                .notification button {
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // إزالة الإشعار تلقائياً بعد 5 ثواني
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    showLoadingIndicator() {
        let loader = document.getElementById('loading-indicator');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loading-indicator';
            loader.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>جاري التحميل...</p>
                </div>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    }

    hideLoadingIndicator() {
        const loader = document.getElementById('loading-indicator');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    setButtonLoading(button, isLoading, text) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        } else {
            button.disabled = false;
            button.textContent = text;
        }
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        const minute = 60 * 1000;
        const hour = minute * 60;
        const day = hour * 24;

        if (diff < minute) {
            return 'الآن';
        } else if (diff < hour) {
            const minutes = Math.floor(diff / minute);
            return `قبل ${minutes} دقيقة`;
        } else if (diff < day) {
            const hours = Math.floor(diff / hour);
            return `قبل ${hours} ساعة`;
        } else {
            return date.toLocaleDateString('ar-EG', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    formatPostContent(content) {
        // تحويل الروابط إلى روابط قابلة للنقر
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return this.escapeHtml(content).replace(urlRegex, url => 
            `<a href="${url}" target="_blank" rel="noopener">${url}</a>`
        ).replace(/\n/g, '<br>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// تهيئة التطبيق عندما يصبح DOM جاهزاً
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ConnectlyApp();
});
