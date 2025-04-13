const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Emission = require('../models/Emission');
const User = require('../models/User');

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

// Add new emission record
router.post('/', verifyToken, async (req, res) => {
  try {
    const { category, source, amount, unit, co2e, dataSource, metadata } = req.body;

    const emission = new Emission({
      userId: req.userId,
      category,
      source,
      amount,
      unit,
      co2e,
      dataSource,
      metadata
    });

    await emission.save();

    res.status(201).json({
      message: 'Emission record added successfully',
      emission
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding emission record', error: error.message });
  }
});

// Get user's emissions
router.get('/', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const query = { userId: req.userId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (category) {
      query.category = category;
    }

    const emissions = await Emission.find(query).sort({ date: -1 });

    res.json(emissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching emissions', error: error.message });
  }
});

// Get emission statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { userId: req.userId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get total emissions
    const totalEmissions = await Emission.getTotalEmissions(req.userId, new Date(startDate), new Date(endDate));

    // Get category breakdown
    const categoryBreakdown = await Emission.getCategoryBreakdown(req.userId, new Date(startDate), new Date(endDate));

    // Get daily averages
    const dailyAverages = await Emission.aggregate([
      {
        $match: query
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          total: { $sum: "$co2e" }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      totalEmissions,
      categoryBreakdown,
      dailyAverages
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching emission statistics', error: error.message });
  }
});

// Update emission record
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const emission = await Emission.findOneAndUpdate(
      { _id: id, userId: req.userId },
      update,
      { new: true }
    );

    if (!emission) {
      return res.status(404).json({ message: 'Emission record not found' });
    }

    res.json({
      message: 'Emission record updated successfully',
      emission
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating emission record', error: error.message });
  }
});

// Delete emission record
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const emission = await Emission.findOneAndDelete({ _id: id, userId: req.userId });

    if (!emission) {
      return res.status(404).json({ message: 'Emission record not found' });
    }

    res.json({ message: 'Emission record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting emission record', error: error.message });
  }
});

// Import emissions data
router.post('/import', verifyToken, async (req, res) => {
  try {
    const { data } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    const emissions = data.map(item => ({
      ...item,
      userId: req.userId,
      dataSource: 'import'
    }));

    await Emission.insertMany(emissions);

    res.status(201).json({
      message: 'Emissions data imported successfully',
      count: emissions.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error importing emissions data', error: error.message });
  }
});

// Store a carbon footprint submission
router.post('/carbon-footprint', verifyToken, async (req, res) => {
  try {
    const { 
      carbonFootprint, 
      date,
      details // Optional object containing calculation details
    } = req.body;

    if (!carbonFootprint || typeof carbonFootprint !== 'number') {
      return res.status(400).json({ message: 'Valid carbon footprint value is required' });
    }

    // Find user and update their emissions record
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize emissions array if it doesn't exist
    if (!user.emissions) {
      user.emissions = [];
    }

    // Add new emission record
    user.emissions.push({
      value: carbonFootprint,
      date: date || new Date(),
      details: details || {}
    });

    // Keep only the last 30 records if there are too many
    if (user.emissions.length > 30) {
      user.emissions = user.emissions.slice(-30);
    }

    // Calculate average carbon footprint
    const totalEmissions = user.emissions.reduce((sum, emission) => sum + emission.value, 0);
    const averageEmission = user.emissions.length > 0 ? totalEmissions / user.emissions.length : 0;
    
    // Update user's average carbon footprint
    user.averageCarbonFootprint = averageEmission;

    await user.save();

    res.status(201).json({
      message: 'Carbon footprint recorded successfully',
      emissions: user.emissions,
      average: averageEmission
    });
  } catch (error) {
    console.error('Error saving carbon footprint:', error);
    res.status(500).json({ message: 'Error saving carbon footprint', error: error.message });
  }
});

// Get user's carbon footprint history
router.get('/carbon-footprint', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const emissions = user.emissions || [];
    const average = user.averageCarbonFootprint || 0;

    res.json({
      emissions,
      average,
      total: emissions.reduce((sum, emission) => sum + emission.value, 0)
    });
  } catch (error) {
    console.error('Error fetching carbon footprint:', error);
    res.status(500).json({ message: 'Error fetching carbon footprint', error: error.message });
  }
});

// Get carbon footprint data
router.get('/carbon-footprint', verifyToken, async (req, res) => {
  try {
    // Query all user's emissions
    const emissions = await Emission.find({ userId: req.userId });
    
    // Calculate total
    const total = emissions.reduce((sum, emission) => sum + emission.co2e, 0);
    
    // Calculate average per entry
    const average = emissions.length > 0 ? total / emissions.length : 0;
    
    // Find latest submission
    const latest = await Emission.findOne({ userId: req.userId })
      .sort({ date: -1 });
    
    // Get entries by date for trend analysis
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const recentEmissions = await Emission.find({
      userId: req.userId,
      date: { $gte: lastMonth }
    }).sort({ date: 1 });
    
    const trend = recentEmissions.map(em => ({
      date: em.date,
      value: em.co2e
    }));
    
    res.json({
      total,
      average,
      latest: latest || null,
      trend,
      emissionsCount: emissions.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching carbon footprint data', error: error.message });
  }
});

module.exports = router; 