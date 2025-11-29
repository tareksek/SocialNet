// app/api/auth/register/route.js
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  await connectDB();
  const { username, email, password } = await req.json();

  const exists = await User.findOne({ $or: [{ email }, { username }] });
  if (exists) return Response.json({ error: 'المستخدم موجود' }, { status: 400 });

  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({ username, email, password: hashed });

  return Response.json({ message: 'تم التسجيل بنجاح', userId: user._id });
}
