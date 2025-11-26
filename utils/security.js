
// utils/security.js
const xss = require('xss'); // نحتاج لتنصيبه: npm install xss

// تنقية النصوص من XSS (خاصة في الـ username والمحتوى)
exports.sanitizeInput = (str) => {
  if (typeof str !== 'string') return '';
  // السماح ببعض الرموز الآمنة فقط في الاسم (أحرف، أرقام، _، -، مسافات)
  return xss(str, {
    whiteList: {}, // لا نسمح بأي وسوم HTML
    stripIgnoreTag: true,
    allowCommentTag: false
  }).trim();
};

// تحقق من صحة البريد الإلكتروني
exports.isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// تحقق من صحة اسم المستخدم (أحرف عربية/إنجليزية، أرقام، _، -، طول 3-20)
exports.isValidUsername = (username) => {
  const re = /^[\u0600-\u06FFa-zA-Z0-9_\- ]{3,20}$/;
  return re.test(username);
};
