// app/api/auth/login/route.js
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  await connectDB();
  const { email, password } = await req.json();

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return Response.json({ error: 'بيانات خاطئة' }, { status: 401 });
  }

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

  return Response.json({
    token,
    user: {
      id: user._id,
      username: user.username,
      profilePic: user.profilePic,
    }
  });
}
