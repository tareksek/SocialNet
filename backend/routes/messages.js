
const express = require('express');
const { Message, Conversation } = require('../models/Message');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for message attachments
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `message-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  }
});

// @desc    Get or create conversation
// @route   POST /api/messages/conversation
// @access  Private
router.post('/conversation', protect, async (req, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المشارك مطلوب'
      });
    }

    // Find existing conversation
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user.id, participantId] }
    });

    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        participants: [req.user.id, participantId],
        isGroup: false
      });
    }

    await conversation.populate('participants', 'firstName lastName profilePicture');

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

// @desc    Send message
// @route   POST /api/messages/send
// @access  Private
router.post('/send', protect, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 }
]), async (req, res) => {
  try {
    const { conversationId, receiverId, content } = req.body;

    if (!conversationId && !receiverId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المحادثة أو المستقبل مطلوب'
      });
    }

    let conversation;

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    } else {
      // Create new conversation if doesn't exist
      conversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [req.user.id, receiverId] }
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [req.user.id, receiverId],
          isGroup: false
        });
      }
    }

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    const messageData = {
      conversation: conversation._id,
      sender: req.user.id,
      receiver: receiverId || conversation.participants.find(p => p.toString() !== req.user.id),
      content
    };

    if (req.files && req.files.image) {
      messageData.image = {
        url: req.files.image[0].filename,
        publicId: req.files.image[0].filename
      };
    }

    if (req.files && req.files.file) {
      const file = req.files.file[0];
      messageData.file = {
        url: file.filename,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size
      };
    }

    const message = await Message.create(messageData);

    // Update conversation last message
    conversation.lastMessage = message._id;
    await conversation.save();

    await message.populate('sender', 'firstName lastName profilePicture');
    await message.populate('receiver', 'firstName lastName profilePicture');

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

// @desc    Get conversation messages
// @route   GET /api/messages/conversation/:conversationId
// @access  Private
router.get('/conversation/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'المحادثة غير موجودة'
      });
    }

    // Check if user is participant
    if (!conversation.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بالوصول إلى هذه المحادثة'
      });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'firstName lastName profilePicture')
      .populate('receiver', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalMessages = await Message.countDocuments({ conversation: conversationId });

    res.json({
      success: true,
      messages: messages.reverse(), // To show oldest first
      totalPages: Math.ceil(totalMessages / limit),
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

// @desc    Get user conversations
// @route   GET /api/messages/conversations
// @access  Private
router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id
    })
      .populate('participants', 'firstName lastName profilePicture isOnline lastSeen')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      conversations
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