const Emission = require('../models/Emission');
const User = require('../models/User');
const Family = require('../models/Family');

// @desc    Log a new emission
// @route   POST /api/emissions
// @access  Private
exports.logEmission = async (req, res) => {
  try {
    const { category, subcategory, details } = req.body;
    const userId = req.user.id;
    
    // Find user to get familyId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Create emission record
    const emission = new Emission({
      userId,
      familyId: user.familyId,
      category,
      subcategory,
      details,
      source: req.body.source || 'manual'
    });
    
    // Calculate CO2 value from the details
    const co2Value = emission.calculateCO2Equivalent();
    emission.value = co2Value;
    
    await emission.save();
    
    // If this user is part of a family, update family total
    if (user.familyId) {
      await Family.findByIdAndUpdate(
        user.familyId,
        { $inc: { totalEmissions: co2Value } }
      );
    }
    
    // Emit real-time update if significant emission
    if (co2Value > 10) { // Threshold for "significant" emission
      const io = req.app.get('io');
      io.emit('emissionAlert', {
        userId,
        familyId: user.familyId,
        category,
        value: co2Value,
        timestamp: new Date()
      });
    }
    
    res.status(201).json({
      success: true,
      data: emission
    });
  } catch (error) {
    console.error('Log emission error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get user emissions (with optional filtering)
// @route   GET /api/emissions
// @access  Private
exports.getUserEmissions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period, category, startDate, endDate } = req.query;
    
    // Build query
    const query = { userId };
    
    // Add date filtering if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (period) {
      // Handle period filtering (day, week, month, year)
      const now = new Date();
      let periodStart;
      
      switch (period) {
        case 'day':
          periodStart = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          periodStart = new Date(now.setDate(now.getDate() - now.getDay()));
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'month':
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          periodStart = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          periodStart = null;
      }
      
      if (periodStart) {
        query.date = { $gte: periodStart };
      }
    }
    
    // Add category filtering if provided
    if (category) {
      query.category = category;
    }
    
    // Get emissions with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const emissions = await Emission.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Emission.countDocuments(query);
    
    // Calculate summary statistics
    const totalEmissions = await Emission.getUserTotal(userId, period);
    
    res.json({
      success: true,
      count: emissions.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      summary: totalEmissions,
      data: emissions
    });
  } catch (error) {
    console.error('Get emissions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get a single emission record
// @route   GET /api/emissions/:id
// @access  Private
exports.getEmission = async (req, res) => {
  try {
    const emission = await Emission.findById(req.params.id);
    
    if (!emission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Emission record not found' 
      });
    }
    
    // Check if emission belongs to user
    if (emission.userId.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to access this record' 
      });
    }
    
    res.json({
      success: true,
      data: emission
    });
  } catch (error) {
    console.error('Get emission error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Update an emission record
// @route   PUT /api/emissions/:id
// @access  Private
exports.updateEmission = async (req, res) => {
  try {
    let emission = await Emission.findById(req.params.id);
    
    if (!emission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Emission record not found' 
      });
    }
    
    // Check if emission belongs to user
    if (emission.userId.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to update this record' 
      });
    }
    
    // Get previous value for family total update
    const previousValue = emission.value;
    
    // Update fields
    if (req.body.details) {
      emission.details = req.body.details;
      // Recalculate CO2 value
      emission.value = emission.calculateCO2Equivalent();
    }
    
    if (req.body.category) emission.category = req.body.category;
    if (req.body.subcategory) emission.subcategory = req.body.subcategory;
    if (req.body.date) emission.date = new Date(req.body.date);
    
    await emission.save();
    
    // If user is part of a family, update family total
    if (emission.familyId) {
      const valueDifference = emission.value - previousValue;
      await Family.findByIdAndUpdate(
        emission.familyId,
        { $inc: { totalEmissions: valueDifference } }
      );
    }
    
    res.json({
      success: true,
      data: emission
    });
  } catch (error) {
    console.error('Update emission error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Delete an emission record
// @route   DELETE /api/emissions/:id
// @access  Private
exports.deleteEmission = async (req, res) => {
  try {
    const emission = await Emission.findById(req.params.id);
    
    if (!emission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Emission record not found' 
      });
    }
    
    // Check if emission belongs to user
    if (emission.userId.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this record' 
      });
    }
    
    // If user is part of a family, update family total
    if (emission.familyId) {
      await Family.findByIdAndUpdate(
        emission.familyId,
        { $inc: { totalEmissions: -emission.value } }
      );
    }
    
    await emission.remove();
    
    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Delete emission error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
}; 