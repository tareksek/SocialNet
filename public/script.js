
// تسجيل
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('regUsername').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const bio = document.getElementById('regBio').value;
  
  console.log('محاولة تسجيل:', { username, email }); // للتشخيص
  
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, bio, password })
    });
    const data = await res.json();
    console.log('رد الخادم:', data); // للتشخيص
    if (!res.ok) throw new Error(data.error);
    alert('تم التسجيل! قم بتسجيل الدخول.');
    document.getElementById('registerForm').reset();
  } catch (err) {
    console.error('خطأ:', err);
    alert('خطأ: ' + err.message);
  }
});
