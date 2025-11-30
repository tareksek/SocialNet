const API = 'http://localhost:3000';
let token = localStorage.getItem('token');

function showError(message) {
  const errorElem = document.getElementById('error-message');
  if (errorElem) errorElem.textContent = message;
}

function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  if (!username || !password) return showError('يرجى ملء جميع الحقول');
  fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  } catch(err => {
  console.error('Connection error:', err);
  showError('خطأ في الاتصال: ' + err.message);
});
       ).then(res => res.json()).then(data => {
    if (data.token) {
      token = data.token;
      localStorage.setItem('token', token);
      window.location.href = '/feed.html';
    } else {
      showError(data.error || 'فشل الدخول');
    }
  }).catch(() => showError('خطأ في الاتصال'));
}

function register() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  if (!username || !password || !confirmPassword) return showError('يرجى ملء جميع الحقول');
  if (password !== confirmPassword) return showError('كلمات المرور غير متطابقة');
  fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  } catch(err => {
  console.error('Connection error:', err);
  showError('خطأ في الاتصال: ' + err.message);
});
       ).then(res => res.json()).then(data => {
    if (data.message) {
      alert('تم التسجيل بنجاح');
      window.location.href = '/feed.html';
    } else {
      showError(data.error || 'فشل التسجيل');
    }
  }).catch(() => showError('خطأ في الاتصال'));
}

// باقي الوظائف دون تغيير
