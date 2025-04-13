const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Family = require('../models/Family');
const FamilyMember = require('../models/FamilyMember');
const User = require('../models/User');
const Emission = require('../models/Emission');

// Get JWT secret from config
const JWT_SECRET = process.env.JWT_SECRET || require('config').get('jwtSecret');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId || decoded.user.id;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Create a new family
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Family name is required' });
    }

    // Check if user already has a family
    const existingFamily = await Family.findOne({ 
      members: { $elemMatch: { userId: req.userId } }
    });

    if (existingFamily) {
      return res.status(400).json({ 
        message: 'You are already part of a family',
        family: existingFamily
      });
    }

    // Create new family
    const family = new Family({
      name,
      adminId: req.userId,
      members: [{
        userId: req.userId,
        role: 'admin'
      }]
    });

    await family.save();

    // Update user with family ID
    await User.findByIdAndUpdate(req.userId, { 
      familyId: family._id
    });

    res.status(201).json({
      message: 'Family created successfully',
      family
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating family', error: error.message });
  }
});

// Get user's family
router.get('/myfamily', verifyToken, async (req, res) => {
  try {
    // Find family where user is a member
    const family = await Family.findOne({ 
      members: { $elemMatch: { userId: req.userId } }
    });

    if (!family) {
      return res.status(404).json({ message: 'You are not part of any family' });
    }

    // Get detailed member info
    const membersWithDetails = await family.getMembersWithDetails();

    res.json({
      family: {
        ...family.toObject(),
        membersDetails: membersWithDetails
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching family', error: error.message });
  }
});

// Join a family with invite code
router.post('/join', verifyToken, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    
    if (!inviteCode) {
      return res.status(400).json({ message: 'Invite code is required' });
    }

    // Check if user already has a family
    const userInFamily = await Family.findOne({ 
      members: { $elemMatch: { userId: req.userId } }
    });

    if (userInFamily) {
      return res.status(400).json({ 
        message: 'You are already part of a family',
        family: userInFamily
      });
    }

    // Find family by invite code (using family ID as invite code for simplicity)
    const family = await Family.findById(inviteCode);

    if (!family) {
      return res.status(404).json({ message: 'Family not found with this invite code' });
    }

    // Add user to family members
    family.members.push({
      userId: req.userId,
      role: 'member'
    });

    await family.save();

    // Update user with family ID
    await User.findByIdAndUpdate(req.userId, { 
      familyId: family._id
    });

    res.json({
      message: 'Successfully joined family',
      family
    });
  } catch (error) {
    res.status(500).json({ message: 'Error joining family', error: error.message });
  }
});

// Leave a family
router.post('/leave', verifyToken, async (req, res) => {
  try {
    // Find family where user is a member
    const family = await Family.findOne({ 
      members: { $elemMatch: { userId: req.userId } }
    });

    if (!family) {
      return res.status(404).json({ message: 'You are not part of any family' });
    }

    // If user is admin and there are other members, prevent leaving
    if (family.adminId.toString() === req.userId.toString() && family.members.length > 1) {
      return res.status(400).json({ 
        message: 'As the family admin, you must transfer ownership before leaving'
      });
    }

    // Remove user from family
    family.members = family.members.filter(
      member => member.userId.toString() !== req.userId.toString()
    );

    // If no members left, delete the family
    if (family.members.length === 0) {
      await Family.findByIdAndDelete(family._id);
    } else {
      await family.save();
    }

    // Update user
    await User.findByIdAndUpdate(req.userId, { 
      $unset: { familyId: "" }
    });

    res.json({ 
      message: 'Successfully left the family'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error leaving family', error: error.message });
  }
});

// Generate and get family invite code
router.get('/invite', verifyToken, async (req, res) => {
  try {
    // Find family where user is admin
    const family = await Family.findOne({ adminId: req.userId });

    if (!family) {
      return res.status(404).json({ 
        message: 'You do not have permission to invite to a family' 
      });
    }

    // Use the family ID as the invite code for simplicity
    const inviteCode = family._id;

    res.json({ 
      inviteCode,
      message: 'Share this code to invite others to your family'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating invite code', error: error.message });
  }
});

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

// Get all families for leaderboard
router.get('/all', verifyToken, async (req, res) => {
  try {
    // Get all families with basic information
    const families = await Family.find({})
      .select('name adminId members totalEmissions achievements createdAt')
      .limit(100);  // Limit results for performance
    
    res.json({
      families
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching families', error: error.message });
  }
});

// Get family emissions with member details
router.get('/emissions', verifyToken, async (req, res) => {
  try {
    // Find family where user is a member
    const family = await Family.findOne({ 
      members: { $elemMatch: { userId: req.userId } }
    });

    if (!family) {
      return res.status(404).json({ message: 'You are not part of any family' });
    }

    // Get detailed member info with emissions
    const membersWithEmissions = await Promise.all(family.members.map(async (member) => {
      try {
        // Get user details
        const user = await User.findById(member.userId);
        if (!user) return null;
        
        // Get emissions for this user
        const emissions = await Emission.find({ userId: member.userId });
        const totalEmissions = emissions.reduce((sum, emission) => sum + emission.co2e, 0);
        
        return {
          userId: member.userId,
          role: member.role,
          name: user.username || user.fullName || 'Unknown User',
          emissions: emissions,
          totalEmissions: totalEmissions
        };
      } catch (error) {
        console.error(`Error getting emissions for user ${member.userId}:`, error);
        return null;
      }
    }));

    // Filter out null values and calculate family total
    const validMembers = membersWithEmissions.filter(member => member !== null);
    const familyTotalEmissions = validMembers.reduce((sum, member) => sum + member.totalEmissions, 0);

    res.json({
      family: {
        _id: family._id,
        name: family.name,
        adminId: family.adminId,
        membersWithEmissions: validMembers,
        totalEmissions: familyTotalEmissions
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching family emissions', error: error.message });
  }
});

module.exports = router; 