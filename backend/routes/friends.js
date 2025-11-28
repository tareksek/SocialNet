
const express = require('express');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Send friend request
// @route   POST /api/friends/request/:userId
// @access  Private
router.post('/request/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن إرسال طلب صداقة لنفسك'
      });
    }

    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود'
      });
    }

    // Check if already friends
    if (targetUser.friends.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'أنتم أصدقاء بالفعل'
      });
    }

    // Check if request already sent
    const existingRequest = targetUser.friendRequests.find(
      request => request.user.toString() === req.user.id
    );

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'تم إرسال طلب الصداقة مسبقاً'
      });
    }

    // Add friend request
    targetUser.friendRequests.push({
      user: req.user.id,
      status: 'pending'
    });

    await targetUser.save();

    // Create notification
    await Notification.create({
      user: userId,
      fromUser: req.user.id,
      type: 'friend_request'
    });

    res.json({
      success: true,
      message: 'تم إرسال طلب الصداقة بنجاح'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

// @desc    Respond to friend request
// @route   POST /api/friends/response/:requestId
// @access  Private
router.post('/response/:requestId', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'

    const user = await User.findById(req.user.id);

    // Find the friend request
    const friendRequest = user.friendRequests.id(requestId);

    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        message: 'طلب الصداقة غير موجود'
      });
    }

    if (action === 'accept') {
      // Add to friends
      user.friends.push(friendRequest.user);
      
      const friendUser = await User.findById(friendRequest.user);
      friendUser.friends.push(req.user.id);
      await friendUser.save();

      friendRequest.status = 'accepted';

      // Create notification
      await Notification.create({
        user: friendRequest.user,
        fromUser: req.user.id,
        type: 'friend_accept'
      });
    } else {
      friendRequest.status = 'rejected';
    }

    await user.save();

    res.json({
      success: true,
      message: action === 'accept' ? 'تم قبول طلب الصداقة' : 'تم رفض طلب الصداقة'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

// @desc    Get friend requests
// @route   GET /api/friends/requests
// @access  Private
router.get('/requests', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friendRequests.user', 'firstName lastName profilePicture');

    const pendingRequests = user.friendRequests.filter(
      request => request.status === 'pending'
    );

    res.json({
      success: true,
      requests: pendingRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

// @desc    Get friends list
// @route   GET /api/friends
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'firstName lastName profilePicture isOnline lastSeen');

    res.json({
      success: true,
      friends: user.friends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: error.message
    });
  }
});

// @desc    Remove friend
// @route   DELETE /api/friends/:friendId
// @access  Private
router.delete('/:friendId', protect, async (req, res) => {
  try {
    const { friendId } = req.params;

    // Remove from current user's friends
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { friends: friendId }
    });

    // Remove from friend's friends
    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: req.user.id }
    });

    res.json({
      success: true,
      message: 'تم إلغاء الصداقة بنجاح'
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