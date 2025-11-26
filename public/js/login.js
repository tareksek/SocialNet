
// public/js/login.js
import { sanitizeForDisplay } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const passwordInput = document.getElementById('password');
  const toggleBtn = document.querySelector('.toggle-password');
  const errorMsg = document.getElementById('errorMessage');

  // زر إظهار/إخفاء كلمة المرور
toggleBtn.addEventListener('click', () => {
  const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
  passwordInput.setAttribute('type', type);
  
  const icon = document.getElementById('eyeIcon');
  if (type === 'password') {
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  } else {
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  }
});

  // إرسال النموذج
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value;

    // تنقية أولية (للعرض فقط)
    const cleanEmail = sanitizeForDisplay(email);
    const cleanPassword = sanitizeForDisplay(password);

    // إخفاء رسالة الخطأ القديمة
    errorMsg.style.display = 'none';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
      });

      const data = await res.json();

      if (res.ok) {
        // حفظ بيانات المستخدم في localStorage (تجريبي)
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        
        // إعادة التوجيه إلى لوحة التحكم (لاحقًا)
        alert(`مرحبًا، ${data.user.username}!`);
        window.location.href = '/feed'; // أو صفحة رئيسية لاحقًا
      } else {
        errorMsg.textContent = data.error || 'حدث خطأ غير متوقع';
        errorMsg.style.display = 'block';
      }
    } catch (err) {
      errorMsg.textContent = 'فشل الاتصال بالخادم. تحقق من اتصالك.';
      errorMsg.style.display = 'block';
    }
  });
});
