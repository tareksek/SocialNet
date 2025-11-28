const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'الاسم الأول مطلوب'],
    trim: true,
    maxlength: [50, 'الاسم الأول لا يمكن أن يزيد عن 50 حرف']
  },
  lastName: {
    type: String,
    required: [true, 'اسم العائلة مطلوب'],
    trim: true,
    maxlength: [50, 'اسم العائلة لا يمكن أن يزيد عن 50 حرف']
  },
  email: {
    type: String,
    required: [true, 'البريد الإلكتروني مطلوب'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'يرجى إدخال بريد إلكتروني صحيح']
  },
  password: {
    type: String,
    required: [true, 'كلمة المرور مطلوبة'],
    minlength: [6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'],
    select: false
  },
  profilePicture: {
    type: String,
    default: 'default-profile.png'
  },
  coverPhoto: {
    type: String,
    default: 'default-cover.jpg'
  },
  bio: {
    type: String,
    maxlength: [500, 'السيرة الذاتية لا يمكن أن تزيد عن 500 حرف']
  },
  location: String,
  website: String,
  birthdate: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Update last seen
userSchema.methods.updateLastSeen = function() {
  this.lastSeen = Date.now();
  return this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('User', userSchema);