// models/Story.js
import mongoose from 'mongoose';

const StorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image: { type: String, required: true },
  views: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  expiresAt: { type: Date, default: () => Date.now() + 24*60*60*1000 }, // 24 ساعة
}, { timestamps: true });

export default mongoose.models.Story || mongoose.model('Story', StorySchema);
