const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Challenge = require('../models/Challenge');
const User = require('../models/User');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Create a new challenge
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      type,
      difficulty,
      duration,
      goals,
      rewards,
      requirements
    } = req.body;

    const challenge = new Challenge({
      title,
      description,
      category,
      type,
      difficulty,
      duration,
      goals,
      rewards,
      requirements,
      createdBy: req.userId
    });

    await challenge.save();

    res.status(201).json({
      message: 'Challenge created successfully',
      challenge
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating challenge', error: error.message });
  }
});

// Get all challenges
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, category, type } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (type) query.type = type;

    const challenges = await Challenge.find(query)
      .sort({ createdAt: -1 });

    res.json(challenges);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching challenges', error: error.message });
  }
});

// Get active challenges
router.get('/active', verifyToken, async (req, res) => {
  try {
    const challenges = await Challenge.getActiveChallenges();
    res.json(challenges);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active challenges', error: error.message });
  }
});

// Get challenge details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    res.json(challenge);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching challenge', error: error.message });
  }
});

// Join a challenge
router.post('/:id/join', verifyToken, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    await challenge.joinChallenge(req.userId);

    res.json({
      message: 'Successfully joined the challenge',
      challenge
    });
  } catch (error) {
    res.status(500).json({ message: 'Error joining challenge', error: error.message });
  }
});

// Update challenge progress
router.put('/:id/progress', verifyToken, async (req, res) => {
  try {
    const { progress } = req.body;
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    await challenge.updateProgress(req.userId, progress);

    res.json({
      message: 'Progress updated successfully',
      challenge
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating progress', error: error.message });
  }
});

// Get challenge leaderboard
router.get('/:id/leaderboard', verifyToken, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    const leaderboard = await challenge.calculateLeaderboard();

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leaderboard', error: error.message });
  }
});

// Get user's challenges
router.get('/user/challenges', verifyToken, async (req, res) => {
  try {
    const { status } = req.query;
    const query = { 'participants.userId': req.userId };

    if (status) {
      query.status = status;
    }

    const challenges = await Challenge.find(query)
      .sort({ createdAt: -1 });

    res.json(challenges);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user challenges', error: error.message });
  }
});

// Update challenge status
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ message: 'Challenge not found' });
    }

    if (challenge.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this challenge' });
    }

    challenge.status = status;
    await challenge.save();

    res.json({
      message: 'Challenge status updated successfully',
      challenge
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating challenge status', error: error.message });
  }
});

module.exports = router; 