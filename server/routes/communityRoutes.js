const express = require('express');
const router = express.Router();
const Community = require('../models/Community');
const { protect } = require('../middleware/authMiddleware');

// Get all communities
router.get('/', async (req, res, next) => {
  try {
    let communities = await Community.find();
    if (communities.length === 0) {
      // Create some default communities
      const defaults = [
        { name: 'General', description: 'General chat for everyone.' },
        { name: 'Tech', description: 'Discussions about technology.' },
        { name: 'Gaming', description: 'Discussions about games.' },
        { name: 'Movies', description: 'Discussions about movies.' }
      ];
      communities = await Community.insertMany(defaults);
    }
    res.json(communities);
  } catch (error) {
    next(error);
  }
});

// Create a community
router.post('/', protect, async (req, res, next) => {
  const { name, description } = req.body;
  try {
    const communityExists = await Community.findOne({ name });
    if (communityExists) {
      return res.status(400).json({ message: 'Community already exists' });
    }

    const community = await Community.create({ name, description });
    res.status(201).json(community);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
