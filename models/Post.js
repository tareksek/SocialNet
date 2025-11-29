import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: String,
  images: [String],
  video: String,
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: { type: Map, of: Number, default: {} }, // ❤️: 5, 😂: 3 ...
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

export default mongoose.models.Post || mongoose.model('Post', PostSchema);
