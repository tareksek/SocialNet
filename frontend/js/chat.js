// إدارة نظام الدردشة والمراسلة
class ChatManager {
    constructor() {
        this.currentConversation = null;
        this.conversations = [];
        this.isChatOpen = false;
        this.typingUsers = new Set();
    }

    // تهيئة نظام الدردشة
    initialize() {
        this.setupChatListeners();
        this.loadConversations();
    }

    // إعداد مستمعي الأحداث للدردشة
    setupChatListeners() {
        // فتح نافذة الدردشة
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-open-chat]')) {
                const userId = e.target.closest('[data-open-chat]').getAttribute('data-open-chat');
                this.openChat(userId);
            }
        });

        // إرسال رسالة
        document.getElementById('sendMessage')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('chatMessageInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // إغلاق الدردشة
        document.getElementById('closeChat')?.addEventListener('click', () => this.closeChat());

        // بدء وإيقاف الكتابة
        document.getElementById('chatMessageInput')?.addEventListener('input', () => {
            this.handleTyping();
        });
    }

    // فتح نافذة الدردشة
    async openChat(userId) {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/messages/conversation`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ participantId: userId })
            });

            if (response.ok) {
                const data = await response.json();
                this.currentConversation = data.conversation;
                this.showChatWindow();
                this.loadMessages();
            }
        } catch (error) {
            showNotification('خطأ في فتح المحادثة', 'error');
        }
    }

    // عرض نافذة الدردشة
    showChatWindow() {
        const chatWindow = document.getElementById('chatWindow');
        chatWindow.classList.add('open');
        this.isChatOpen = true;

        // تحديث معلومات المستخدم في رأس الدردشة
        const otherUser = this.currentConversation.participants.find(
            p => p._id !== appState.currentUser._id
        );
        
        document.getElementById('chatUserName').textContent = 
            `${otherUser.firstName} ${otherUser.lastName}`;
        
        const avatar = document.getElementById('chatUserAvatar');
        avatar.innerHTML = otherUser.profilePicture ? 
            `<img src="${CONFIG.UPLOADS_URL}/${otherUser.profilePicture}" alt="${otherUser.firstName}">` :
            otherUser.firstName.charAt(0);
    }

    // إغلاق نافذة الدردشة
    closeChat() {
        document.getElementById('chatWindow').classList.remove('open');
        this.isChatOpen = false;
        this.currentConversation = null;
    }

    // تحميل الرسائل
    async loadMessages() {
        if (!this.currentConversation) return;

        try {
            const response = await fetch(
                `${CONFIG.API_BASE_URL}/messages/conversation/${this.currentConversation._id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                this.renderMessages(data.messages);
            }
        } catch (error) {
            showNotification('خطأ في تحميل الرسائل', 'error');
        }
    }

    // عرض الرسائل
    renderMessages(messages) {
        const container = document.getElementById('chatMessages');
        container.innerHTML = '';

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            container.appendChild(messageElement);
        });

        // التمرير للأسفل
        container.scrollTop = container.scrollHeight;
    }

    // إنشاء عنصر رسالة
    createMessageElement(message) {
        const div = document.createElement('div');
        const isSent = message.sender._id === appState.currentUser._id;
        
        div.className = `message ${isSent ? 'sent' : 'received'}`;
        div.innerHTML = `
            ${message.image ? 
                `<img src="${CONFIG.UPLOADS_URL}/${message.image.url}" style="max-width: 200px; border-radius: 8px; margin-bottom: 5px;">` : 
                ''
            }
            ${message.file ? 
                `<div class="file-message">
                    <i class="fas fa-file"></i>
                    <span>${message.file.originalName}</span>
                </div>` : 
                ''
            }
            ${message.content ? `<div class="message-text">${message.content}</div>` : ''}
            <div class="message-time">${this.formatMessageTime(message.createdAt)}</div>
        `;

        return div;
    }

    // إرسال رسالة
    async sendMessage() {
        const input = document.getElementById('chatMessageInput');
        const content = input.value.trim();

        if (!content && !this.currentFile) return;

        try {
            const formData = new FormData();
            formData.append('conversationId', this.currentConversation._id);
            formData.append('content', content);

            if (this.currentFile) {
                formData.append('file', this.currentFile);
            }

            const response = await fetch(`${CONFIG.API_BASE_URL}/messages/send`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (response.ok) {
                input.value = '';
                this.currentFile = null;
                this.stopTyping();
                this.loadMessages(); // إعادة تحميل الرسائل
            }
        } catch (error) {
            showNotification('خطأ في إرسال الرسالة', 'error');
        }
    }

    // التعامل مع الكتابة
    handleTyping() {
        if (!this.typingTimeout) {
            // بدء الكتابة
            appState.socket.emit('typing-start', {
                conversationId: this.currentConversation._id,
                receiverId: this.getOtherUserId()
            });
        }

        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 1000);
    }

    // إيقاف الكتابة
    stopTyping() {
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
            this.typingTimeout = null;
            
            appState.socket.emit('typing-stop', {
                conversationId: this.currentConversation._id,
                receiverId: this.getOtherUserId()
            });
        }
    }

    // الحصول على معرف المستخدم الآخر
    getOtherUserId() {
        return this.currentConversation.participants.find(
            p => p._id !== appState.currentUser._id
        )._id;
    }

    // تنسيق وقت الرسالة
    formatMessageTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('ar-SA', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else {
            return date.toLocaleDateString('ar-SA', {
                month: 'short',
                day: 'numeric'
            });
        }
    }

    // تحميل المحادثات
    async loadConversations() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/messages/conversations`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.conversations = data.conversations;
                this.renderConversations();
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    // عرض المحادثات
    renderConversations() {
        const container = document.getElementById('conversationsList');
        if (!container) return;

        container.innerHTML = this.conversations.map(conversation => {
            const otherUser = conversation.participants.find(
                p => p._id !== appState.currentUser._id
            );

            return `
                <div class="conversation-item" data-conversation-id="${conversation._id}">
                    <div class="user-avatar">
                        ${otherUser.profilePicture ? 
                            `<img src="${CONFIG.UPLOADS_URL}/${otherUser.profilePicture}" alt="${otherUser.firstName}">` :
                            otherUser.firstName.charAt(0)
                        }
                        ${otherUser.isOnline ? '<span class="online-dot"></span>' : ''}
                    </div>
                    <div class="conversation-info">
                        <div class="conversation-name">${otherUser.firstName} ${otherUser.lastName}</div>
                        <div class="conversation-preview">
                            ${conversation.lastMessage ? conversation.lastMessage.content : 'لا توجد رسائل'}
                        </div>
                    </div>
                    <div class="conversation-time">
                        ${conversation.lastMessage ? this.formatMessageTime(conversation.lastMessage.createdAt) : ''}
                    </div>
                </div>
            `;
        }).join('');

        // إضافة مستمعي الأحداث لعناصر المحادثة
        container.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const conversationId = item.getAttribute('data-conversation-id');
                this.openConversation(conversationId);
            });
        });
    }

    // فتح محادثة محددة
    async openConversation(conversationId) {
        try {
            const conversation = this.conversations.find(c => c._id === conversationId);
            if (conversation) {
                this.currentConversation = conversation;
                this.showChatWindow();
                this.loadMessages();
            }
        } catch (error) {
            showNotification('خطأ في فتح المحادثة', 'error');
        }
    }
}

// تهيئة مدير الدردشة
const chatManager = new ChatManager();