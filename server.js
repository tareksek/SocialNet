const express = require("express");
const fs = require("fs");
const cors = require("cors");
const authRoutes = require("/backend/routes/auth");

const app = express();
app.use(express.json());
app.use(cors());

// تحميل قاعدة البيانات
global.db = JSON.parse(fs.readFileSync("database.json", "utf8"));

// الراوتر
app.use("/api/auth", authRoutes);

// تشغيل السيرفر
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
