// models/Message.js
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: String,
  image: String,
  seen: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
