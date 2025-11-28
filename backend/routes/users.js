const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `user-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('يسمح برفع الصور فقط'), false);
    }
  }
});

// @desc    Get user profile
// @route   GET /api/users/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -friendRequests')
      .populate('friends', 'firstName lastName profilePicture');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, bio, location, website } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        firstName,
        lastName,
        bio,
        location,
        website
      },
      {
        new: true,
        runValidators: true
      }
    ).select('-password');

    res.json({
      success: true,
      message: 'تم تحديث الملف الشخصي بنجاح',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

// @desc    Upload profile picture
// @route   POST /api/users/upload-photo
// @access  Private
router.post('/upload-photo', protect, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'يرجى اختيار صورة'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        profilePicture: req.file.filename
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'تم تحديث الصورة بنجاح',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

// @desc    Search users
// @route   GET /api/users/search/:query
// @access  Public
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('firstName lastName profilePicture').limit(20);

    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

module.exports = router;