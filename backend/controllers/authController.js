const saveDB = require("../utils/saveDB");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SECRET = "MY_SUPER_SECRET_KEY"; // يمكنك تغييره لاحقًا

exports.register = async (req, res) => {
    const { username, email, password } = req.body;

    // التحقق من عدم وجود المستخدم مسبقًا
    const exists = global.db.users.find(u => u.email === email);
    if (exists) return res.json({ success: false, message: "Email already exists" });

    // تشفير كلمة السر
    const hashed = await bcrypt.hash(password, 10);

    const newUser = {
        id: Date.now(),
        username,
        email,
        password: hashed
    };

    global.db.users.push(newUser);
    saveDB();

    return res.json({ success: true, message: "User registered successfully" });
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    const user = global.db.users.find(u => u.email === email);
    if (!user) return res.json({ success: false, message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.json({ success: false, message: "Invalid password" });

    // إنشاء توكن
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: "7d" });

    return res.json({ success: true, token });
};
