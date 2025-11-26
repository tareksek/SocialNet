
// public/js/register.js
import { sanitizeForDisplay, isValidEmail, isValidUsername } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const passwordInput = document.getElementById('password');
  const toggleBtn = document.querySelector('.toggle-password');
  const errorMsg = document.getElementById('errorMessage');

  toggleBtn.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    toggleBtn.textContent = type === 'password' ? '👁️' : '🔒';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value;

    // التحقق من الصحة في الواجهة (لتحسين UX)
    if (!isValidUsername(username)) {
      showError('اسم المستخدم يجب أن يكون 3-20 حرفًا (عربي/إنجليزي، أرقام، _، -)');
      return;
    }

    if (!isValidEmail(email)) {
      showError('الرجاء إدخال بريد إلكتروني صحيح');
      return;
    }

    if (password.length < 6) {
      showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    // تنقية
    const cleanUsername = sanitizeForDisplay(username);
    const cleanEmail = sanitizeForDisplay(email);
    const cleanPassword = sanitizeForDisplay(password);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, email: cleanEmail, password: cleanPassword })
      });

      const data = await res.json();

      if (res.ok) {
        alert('✅ تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
        window.location.href = '/login';
      } else {
        showError(data.error || 'حدث خطأ');
      }
    } catch (err) {
      showError('فشل الاتصال بالخادم. تحقق من الشبكة.');
    }
  });

  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
    errorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});
