
// public/js/utils.js

// تنقية بسيطة من XSS في الواجهة (للعرض فقط — الفعلي في السيرفر)
export function sanitizeForDisplay(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// التحقق من صحة البريد في الواجهة (ليس بديلًا عن السيرفر!)
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// التحقق من اسم المستخدم
export function isValidUsername(username) {
  return /^[\u0600-\u06FFa-zA-Z0-9_\- ]{3,20}$/.test(username);
}
