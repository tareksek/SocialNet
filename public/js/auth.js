// public/js/auth.js  ← نسخة شغالة 100% مع الـ server.js الحالي

document.addEventListener('DOMContentLoaded', () => {
  // نموذج تسجيل الدخول
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault(); // ← هذا السطر يمنع التحديث!

      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;

      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success) {
        window.location.href = '/'; // الانتقال إلى الصفحة الرئيسية
      } else {
        alert(data.message || 'بيانات الدخول غير صحيحة');
      }
    });
  }

  // نموذج إنشاء حساب
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault(); // ← يمنع التحديث!

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
        window.location.href = '/'; // الانتقال إلى الصفحة الرئيسية
      } else {
        alert(data.message || 'فشل إنشاء الحساب');
      }
    });
  }
});
