const mongoose = require('mongoose');

const FamilySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'child'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalEmissions: {
    type: Number,
    default: 0
  },
  monthlyGoal: {
    type: Number,
    default: 0
  },
  achievements: [{
    type: {
      type: String,
      enum: ['reduction', 'streak', 'milestone'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: String,
    date: {
      type: Date,
      default: Date.now
    },
    value: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Method to get family carbon footprint total
FamilySchema.methods.getTotalFootprint = async function() {
  // Calculate from emission records (to be implemented)
  return this.totalEmissions;
};

// Method to get family members details
FamilySchema.methods.getMembersWithDetails = async function() {
  return await mongoose.model('User')
    .find({ _id: { $in: this.members.map(m => m.userId) } })
    .select('-password');
};

module.exports = mongoose.model('Family', FamilySchema); 