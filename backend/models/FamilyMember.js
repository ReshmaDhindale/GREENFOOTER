const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  role: {
    type: String,
    enum: ['parent', 'child', 'other'],
    required: true
  },
  activities: [{
    type: {
      type: String,
      enum: ['transportation', 'energy', 'waste', 'water'],
      required: true
    },
    description: String,
    impact: Number,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  points: {
    type: Number,
    default: 0
  },
  badges: [{
    type: String,
    enum: ['eco_warrior', 'energy_saver', 'water_conserver', 'waste_reducer', 'transport_innovator']
  }],
  preferences: {
    notifications: {
      type: Boolean,
      default: true
    },
    challenges: {
      type: Boolean,
      default: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Method to calculate member's contribution
familyMemberSchema.methods.calculateContribution = async function() {
  const totalImpact = this.activities.reduce((sum, activity) => sum + activity.impact, 0);
  return {
    totalImpact,
    activitiesCount: this.activities.length,
    points: this.points,
    badges: this.badges
  };
};

// Method to add new activity
familyMemberSchema.methods.addActivity = async function(activity) {
  this.activities.push(activity);
  await this.save();
  return this;
};

// Method to update points
familyMemberSchema.methods.updatePoints = async function(points) {
  this.points += points;
  await this.save();
  return this;
};

// Method to add badge
familyMemberSchema.methods.addBadge = async function(badge) {
  if (!this.badges.includes(badge)) {
    this.badges.push(badge);
    await this.save();
  }
  return this;
};

const FamilyMember = mongoose.model('FamilyMember', familyMemberSchema);

module.exports = FamilyMember; 