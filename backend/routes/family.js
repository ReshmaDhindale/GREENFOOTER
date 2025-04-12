const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const FamilyMember = require('../models/FamilyMember');
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

// Add new family member
router.post('/members', verifyToken, async (req, res) => {
  try {
    const { name, age, role } = req.body;

    const member = new FamilyMember({
      userId: req.userId,
      name,
      age,
      role
    });

    await member.save();

    res.status(201).json({
      message: 'Family member added successfully',
      member
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding family member', error: error.message });
  }
});

// Get all family members
router.get('/members', verifyToken, async (req, res) => {
  try {
    const members = await FamilyMember.find({ userId: req.userId });

    res.json(members);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching family members', error: error.message });
  }
});

// Update family member
router.put('/members/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const member = await FamilyMember.findOneAndUpdate(
      { _id: id, userId: req.userId },
      update,
      { new: true }
    );

    if (!member) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    res.json({
      message: 'Family member updated successfully',
      member
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating family member', error: error.message });
  }
});

// Delete family member
router.delete('/members/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const member = await FamilyMember.findOneAndDelete({ _id: id, userId: req.userId });

    if (!member) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    res.json({ message: 'Family member deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting family member', error: error.message });
  }
});

// Add activity for family member
router.post('/members/:id/activities', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, description, impact } = req.body;

    const member = await FamilyMember.findOne({ _id: id, userId: req.userId });

    if (!member) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    await member.addActivity({ type, description, impact });

    res.json({
      message: 'Activity added successfully',
      member
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding activity', error: error.message });
  }
});

// Get member's activities
router.get('/members/:id/activities', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, startDate, endDate } = req.query;

    const member = await FamilyMember.findOne({ _id: id, userId: req.userId });

    if (!member) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    let activities = member.activities;

    if (type) {
      activities = activities.filter(a => a.type === type);
    }

    if (startDate && endDate) {
      activities = activities.filter(a => 
        a.date >= new Date(startDate) && a.date <= new Date(endDate)
      );
    }

    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activities', error: error.message });
  }
});

// Get family statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const members = await FamilyMember.find({ userId: req.userId });
    
    const stats = {
      totalMembers: members.length,
      totalPoints: members.reduce((sum, m) => sum + m.points, 0),
      totalActivities: members.reduce((sum, m) => sum + m.activities.length, 0),
      memberContributions: await Promise.all(
        members.map(async m => ({
          name: m.name,
          ...(await m.calculateContribution())
        }))
      )
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching family statistics', error: error.message });
  }
});

// Update member's points
router.put('/members/:id/points', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { points } = req.body;

    const member = await FamilyMember.findOne({ _id: id, userId: req.userId });

    if (!member) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    await member.updatePoints(points);

    res.json({
      message: 'Points updated successfully',
      member
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating points', error: error.message });
  }
});

// Add badge to member
router.post('/members/:id/badges', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { badge } = req.body;

    const member = await FamilyMember.findOne({ _id: id, userId: req.userId });

    if (!member) {
      return res.status(404).json({ message: 'Family member not found' });
    }

    await member.addBadge(badge);

    res.json({
      message: 'Badge added successfully',
      member
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding badge', error: error.message });
  }
});

module.exports = router; 