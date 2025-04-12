const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Emission = require('../models/Emission');
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

module.exports = router; 