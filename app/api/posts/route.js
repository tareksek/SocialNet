// app/api/posts/route.js
import { connectDB } from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import { getUserIdFromToken } from '@/lib/auth';

export async function GET(request) {
  await connectDB();
  const userId = getUserIdFromToken(request);
  if (!userId) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  const user = await User.findById(userId);
  const friendIds = user.friends.map(f => f.toString());
  const allIds = [...friendIds, userId];

  const posts = await Post.find({ userId: { $in: allIds } })
    .populate('userId', 'username profilePic')
    .sort({ path: 'comments.userId', select: 'username profilePic' })
    .sort({ createdAt: -1 })
    .limit(50);

  return Response.json(posts);
}

export async function POST(request) {
  await connectDB();
  const userId = getUserIdFromToken(request);
  if (!userId) return Response.json({ error: 'غير مصرح' }, { status: 401 });

  const { content, images } = await request.json();
  const post = await Post.create({ userId, content, images });
  await post.populate('userId', 'username profilePic');

  return Response.json(post);
}
