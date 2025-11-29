FROM node:18-alpine

WORKDIR /app

# نسخ package.json أولاً للتخزين المؤقت
COPY package*.json ./

# تثبيت dependencies
RUN npm ci --only=production

# نسخ باقي الملفات
COPY . .

# إنشاء المجلدات اللازمة
RUN mkdir -p uploads logs

# تعيين الصلاحيات
RUN chown -R node:node /app

# التبديل إلى مستخدم غير root
USER node

# فتح المنفذ
EXPOSE 5000

# تشغيل التطبيق
CMD ["npm", "start"]
