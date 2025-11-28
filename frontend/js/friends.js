// إدارة نظام الأصدقاء
class FriendsManager {
    constructor() {
        this.friends = [];
        this.friendRequests = [];
        this.suggestedFriends = [];
    }

    // تهيئة نظام الأصدقاء
    initialize() {
        this.loadFriends();
        this.loadFriendRequests();
        this.loadSuggestedFriends();
        this.setupFriendsListeners();
    }

    // إعداد مستمعي الأحداث للأصدقاء
    setupFriendsListeners() {
        // البحث عن أصدقاء
        document.getElementById('searchFriends')?.addEventListener('input', (e) => {
            this.searchFriends(e.target.value);
        });

        // إرسال طلبات الصداقة
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-send-request]')) {
                const userId = e.target.closest('[data-send-request]').getAttribute('data-send-request');
                this.sendFriendRequest(userId);
            }
        });

        // قبول/رفض طلبات الصداقة
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-accept-request]')) {
                const requestId = e.target.closest('[data-accept-request]').getAttribute('data-accept-request');
                this.respondToFriendRequest(requestId, 'accept');
            }
            
            if (e.target.closest('[data-reject-request]')) {
                const requestId = e.target.closest('[data-reject-request]').getAttribute('data-reject-request');
                this.respondToFriendRequest(requestId, 'reject');
            }
        });
    }

    // تحميل قائمة الأصدقاء
    async loadFriends() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/friends`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.friends = data.friends;
                this.renderFriends();
            }
        } catch (error) {
            console.error('Error loading friends:', error);
        }
    }

    // عرض قائمة الأصدقاء
    renderFriends() {
        const container = document.getElementById('friendsList');
        if (!container) return;

        if (this.friends.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 20px; color: #65676b;">
                    <p>لا يوجد أصدقاء حتى الآن</p>
                    <p>ابدأ بإضافة أصدقاء جدد!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.friends.map(friend => `
            <div class="friend-card">
                <div class="user-avatar">
                    ${friend.profilePicture ? 
                        `<img src="${CONFIG.UPLOADS_URL}/${friend.profilePicture}" alt="${friend.firstName}">` :
                        friend.firstName.charAt(0)
                    }
                    ${friend.isOnline ? '<span class="online-dot"></span>' : ''}
                </div>
                <div class="friend-info">
                    <div class="friend-name">${friend.firstName} ${friend.lastName}</div>
                    <div class="friend-status">
                        ${friend.isOnline ? 'متصل الآن' : `آخر ظهور: ${this.formatLastSeen(friend.lastSeen)}`}
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="friend-action-btn" onclick="chatManager.openChat('${friend._id}')" title="إرسال رسالة">
                        <i class="fas fa-comment"></i>
                    </button>
                    <button class="friend-action-btn" onclick="friendsManager.removeFriend('${friend._id}')" title="إلغاء الصداقة">
                        <i class="fas fa-user-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // تحميل طلبات الصداقة
    async loadFriendRequests() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/friends/requests`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.friendRequests = data.requests;
                this.renderFriendRequests();
            }
        } catch (error) {
            console.error('Error loading friend requests:', error);
        }
    }

    // عرض طلبات الصداقة
    renderFriendRequests() {
        const container = document.getElementById('friendRequestsList');
        if (!container) return;

        if (this.friendRequests.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 20px; color: #65676b;">
                    <p>لا توجد طلبات صداقة جديدة</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.friendRequests.map(request => `
            <div class="friend-request-card">
                <div class="user-avatar">
                    ${request.user.profilePicture ? 
                        `<img src="${CONFIG.UPLOADS_URL}/${request.user.profilePicture}" alt="${request.user.firstName}">` :
                        request.user.firstName.charAt(0)
                    }
                </div>
                <div class="request-info">
                    <div class="request-name">${request.user.firstName} ${request.user.lastName}</div>
                    <div class="request-time">${this.formatRequestTime(request.createdAt)}</div>
                </div>
                <div class="request-actions">
                    <button class="accept-btn" data-accept-request="${request._id}">
                        <i class="fas fa-check"></i>
                        قبول
                    </button>
                    <button class="reject-btn" data-reject-request="${request._id}">
                        <i class="fas fa-times"></i>
                        رفض
                    </button>
                </div>
            </div>
        `).join('');
    }

    // تحميل الأصدقاء المقترحين
    async loadSuggestedFriends() {
        try {
            // في التطبيق الحقيقي، سيكون هناك API منفصل للأصدقاء المقترحين
            // هنا نستخدم البحث كمثال
            const response = await fetch(`${CONFIG.API_BASE_URL}/users/search/ا`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                // تصفية المستخدمين الذين ليسوا أصدقاء بالفعل
                this.suggestedFriends = data.users.filter(user => 
                    !this.friends.some(friend => friend._id === user._id) &&
                    user._id !== appState.currentUser._id
                ).slice(0, 10); // عرض أول 10 اقتراحات فقط
                
                this.renderSuggestedFriends();
            }
        } catch (error) {
            console.error('Error loading suggested friends:', error);
        }
    }

    // عرض الأصدقاء المقترحين
    renderSuggestedFriends() {
        const container = document.getElementById('suggestedFriendsList');
        if (!container) return;

        if (this.suggestedFriends.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 20px; color: #65676b;">
                    <p>لا توجد اقتراحات لأصدقاء في الوقت الحالي</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.suggestedFriends.map(user => `
            <div class="suggested-friend-card">
                <div class="user-avatar">
                    ${user.profilePicture ? 
                        `<img src="${CONFIG.UPLOADS_URL}/${user.profilePicture}" alt="${user.firstName}">` :
                        user.firstName.charAt(0)
                    }
                </div>
                <div class="friend-info">
                    <div class="friend-name">${user.firstName} ${user.lastName}</div>
                    <div class="mutual-friends">15 صديق مشترك</div>
                </div>
                <button class="add-friend-btn" data-send-request="${user._id}">
                    <i class="fas fa-user-plus"></i>
                    إضافة صديق
                </button>
            </div>
        `).join('');
    }

    // إرسال طلب صداقة
    async sendFriendRequest(userId) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/friends/request/${userId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                showNotification('تم إرسال طلب الصداقة بنجاح', 'success');
                // تحديث القائمة
                this.loadSuggestedFriends();
            } else {
                const data = await response.json();
                showNotification(data.message || 'خطأ في إرسال طلب الصداقة', 'error');
            }
        } catch (error) {
            showNotification('خطأ في إرسال طلب الصداقة', 'error');
        }
    }

    // الرد على طلب صداقة
    async respondToFriendRequest(requestId, action) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/friends/response/${requestId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action })
            });

            if (response.ok) {
                showNotification(
                    action === 'accept' ? 'تم قبول طلب الصداقة' : 'تم رفض طلب الصداقة',
                    'success'
                );
                // تحديث القوائم
                this.loadFriendRequests();
                this.loadFriends();
            }
        } catch (error) {
            showNotification('خطأ في معالجة طلب الصداقة', 'error');
        }
    }

    // إزالة صديق
    async removeFriend(friendId) {
        if (!confirm('هل أنت متأكد من إلغاء الصداقة؟')) {
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/friends/${friendId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                showNotification('تم إلغاء الصداقة بنجاح', 'success');
                this.loadFriends();
            }
        } catch (error) {
            showNotification('خطأ في إلغاء الصداقة', 'error');
        }
    }

    // البحث عن أصدقاء
    async searchFriends(query) {
        if (!query.trim()) {
            this.renderFriends();
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/users/search/${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.renderSearchResults(data.users);
            }
        } catch (error) {
            console.error('Error searching friends:', error);
        }
    }

    // عرض نتائج البحث
    renderSearchResults(users) {
        const container = document.getElementById('friendsList');
        if (!container) return;

        if (users.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 20px; color: #65676b;">
                    <p>لا توجد نتائج للبحث</p>
                </div>
            `;
            return;
        }

        container.innerHTML = users.map(user => `
            <div class="friend-card">
                <div class="user-avatar">
                    ${user.profilePicture ? 
                        `<img src="${CONFIG.UPLOADS_URL}/${user.profilePicture}" alt="${user.firstName}">` :
                        user.firstName.charAt(0)
                    }
                </div>
                <div class="friend-info">
                    <div class="friend-name">${user.firstName} ${user.lastName}</div>
                    <div class="friend-email">${user.email}</div>
                </div>
                <div class="friend-actions">
                    ${this.friends.some(friend => friend._id === user._id) ? 
                        '<span class="friend-status-badge">صديق</span>' :
                        `<button class="add-friend-btn" data-send-request="${user._id}">
                            <i class="fas fa-user-plus"></i>
                            إضافة صديق
                        </button>`
                    }
                </div>
            </div>
        `).join('');
    }

    // تنسيق وقت آخر ظهور
    formatLastSeen(timestamp) {
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

    // تنسيق وقت طلب الصداقة
    formatRequestTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        const days = Math.floor(diff / 86400000);
        
        if (days === 0) return 'اليوم';
        if (days === 1) return 'أمس';
        if (days < 7) return `منذ ${days} أيام`;
        
        return date.toLocaleDateString('ar-SA');
    }
}

// تهيئة مدير الأصدقاء
const friendsManager = new FriendsManager();