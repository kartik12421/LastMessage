const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/authMiddleware');

// Get messages for a community
router.get('/:communityId', protect, async (req, res, next) => {
  try {
    const messages = await Message.find({ communityId: req.params.communityId })
      .sort({ createdAt: 1 })
      .limit(50);
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
