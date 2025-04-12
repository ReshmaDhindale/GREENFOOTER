const express = require('express');
const router = express.Router();
const { 
  logEmission, 
  getUserEmissions, 
  getEmission, 
  updateEmission, 
  deleteEmission 
} = require('../controllers/emissionController');
const { protect } = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(protect);

// @route   POST /api/emissions
// @desc    Log a new emission
// @access  Private
router.post('/', logEmission);

// @route   GET /api/emissions
// @desc    Get all user emissions with optional filtering
// @access  Private
router.get('/', getUserEmissions);

// @route   GET /api/emissions/:id
// @desc    Get single emission record
// @access  Private
router.get('/:id', getEmission);

// @route   PUT /api/emissions/:id
// @desc    Update emission record
// @access  Private
router.put('/:id', updateEmission);

// @route   DELETE /api/emissions/:id
// @desc    Delete emission record
// @access  Private
router.delete('/:id', deleteEmission);

module.exports = router; 