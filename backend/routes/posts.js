
const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for post media
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `post-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('يسمح برفع الصور والفيديوهات فقط'), false);
    }
  }
});

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
router.post('/', protect, upload.array('media', 10), async (req, res) => {
  try {
    const { content, privacy } = req.body;

    const postData = {
      user: req.user.id,
      content,
      privacy: privacy || 'public'
    };

    // Handle uploaded media
    if (req.files && req.files.length > 0) {
      const images = [];
      const videos = [];

      req.files.forEach(file => {
        if (file.mimetype.startsWith('image/')) {
          images.push({
            url: file.filename,
            publicId: file.filename
          });
        } else if (file.mimetype.startsWith('video/')) {
          videos.push({
            url: file.filename,
            publicId: file.filename
          });
        }
      });

      if (images.length > 0) postData.images = images;
      if (videos.length > 0) postData.video = videos[0];
    }

    const post = await Post.create(postData);
    await post.populate('user', 'firstName lastName profilePicture');

    res.status(201).json({
      success: true,
      message: 'تم إنشاء المنشور بنجاح',
      post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

// @desc    Get all posts for feed
// @route   GET /api/posts
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get user's friends
    const user = await User.findById(req.user.id);
    const friendIds = user.friends.map(friend => friend.toString());
    friendIds.push(req.user.id);

    const posts = await Post.find({
      $or: [
        { user: { $in: friendIds } },
        { privacy: 'public' }
      ]
    })
      .populate('user', 'firstName lastName profilePicture')
      .populate('comments.user', 'firstName lastName profilePicture')
      .populate('likes.user', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments({
      $or: [
        { user: { $in: friendIds } },
        { privacy: 'public' }
      ]
    });

    res.json({
      success: true,
      posts,
      totalPages: Math.ceil(totalPosts / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

// @desc    Like/unlike a post
// @route   POST /api/posts/:id/like
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'المنشور غير موجود'
      });
    }

    const alreadyLiked = post.likes.find(
      like => like.user.toString() === req.user.id
    );

    if (alreadyLiked) {
      // Unlike
      post.likes = post.likes.filter(
        like => like.user.toString() !== req.user.id
      );
    } else {
      // Like
      post.likes.push({ user: req.user.id });

      // Create notification if not the post owner
      if (post.user.toString() !== req.user.id) {
        await Notification.create({
          user: post.user,
          fromUser: req.user.id,
          type: 'like_post',
          post: post._id
        });
      }
    }

    await post.save();

    res.json({
      success: true,
      message: alreadyLiked ? 'تم إلغاء الإعجاب' : 'تم الإعجاب بالمنشور',
      likesCount: post.likes.length,
      liked: !alreadyLiked
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

// @desc    Add comment to post
// @route   POST /api/posts/:id/comment
// @access  Private
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'محتوى التعليق مطلوب'
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'المنشور غير موجود'
      });
    }

    post.comments.push({
      user: req.user.id,
      content
    });

    await post.save();
    await post.populate('comments.user', 'firstName lastName profilePicture');

    const newComment = post.comments[post.comments.length - 1];

    // Create notification if not the post owner
    if (post.user.toString() !== req.user.id) {
      await Notification.create({
        user: post.user,
        fromUser: req.user.id,
        type: 'comment_post',
        post: post._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'تم إضافة التعليق بنجاح',
      comment: newComment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'المنشور غير موجود'
      });
    }

    // Check if user owns the post
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بحذف هذا المنشور'
      });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'تم حذف المنشور بنجاح'
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