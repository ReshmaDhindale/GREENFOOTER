const mongoose = require('mongoose');

const carbonOffsetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  projectId: {
    type: String,
    required: true
  },
  projectName: {
    type: String,
    required: true
  },
  projectType: {
    type: String,
    enum: ['reforestation', 'renewable_energy', 'carbon_capture', 'conservation'],
    required: true
  },
  location: {
    country: String,
    region: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  contribution: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'USD'
    },
    co2Offset: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  verification: {
    standard: {
      type: String,
      enum: ['VCS', 'GoldStandard', 'CDM', 'other'],
      required: true
    },
    certificateId: String,
    verificationDate: Date,
    verifiedBy: String
  },
  impact: {
    treesPlanted: Number,
    energyGenerated: {
      amount: Number,
      unit: String
    },
    areaProtected: {
      amount: Number,
      unit: String
    }
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  updates: [{
    date: Date,
    description: String,
    photos: [String],
    metrics: {
      type: Map,
      of: Number
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
carbonOffsetSchema.index({ userId: 1, projectType: 1 });
carbonOffsetSchema.index({ status: 1, 'contribution.date': -1 });

// Method to add update
carbonOffsetSchema.methods.addUpdate = async function(update) {
  this.updates.push({
    date: new Date(),
    description: update.description,
    photos: update.photos || [],
    metrics: update.metrics || new Map()
  });
  
  this.lastUpdated = new Date();
  await this.save();
  return this;
};

// Method to calculate total offset
carbonOffsetSchema.methods.calculateTotalOffset = function() {
  return {
    co2: this.contribution.co2Offset,
    trees: this.impact.treesPlanted || 0,
    area: this.impact.areaProtected || 0
  };
};

// Static method to get user's total offsets
carbonOffsetSchema.statics.getUserTotalOffsets = async function(userId) {
  const offsets = await this.find({ userId, status: 'completed' });
  
  return offsets.reduce((total, offset) => ({
    co2: total.co2 + offset.contribution.co2Offset,
    trees: total.trees + (offset.impact.treesPlanted || 0),
    area: total.area + (offset.impact.areaProtected || 0)
  }), { co2: 0, trees: 0, area: 0 });
};

// Static method to get projects by type
carbonOffsetSchema.statics.getProjectsByType = async function(projectType) {
  return this.find({ projectType, status: 'active' })
    .sort({ 'contribution.date': -1 });
};

const CarbonOffset = mongoose.model('CarbonOffset', carbonOffsetSchema);

module.exports = CarbonOffset; 