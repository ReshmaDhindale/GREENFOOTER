const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  birthDate: {
    type: Date
  },
  profilePicture: {
    type: String,
    default: 'default-avatar.png'
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'family-admin'],
    default: 'user'
  },
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  familyName: {
    type: String,
    required: true
  },
  householdSize: {
    type: Number,
    required: true
  },
  homeSize: {
    type: Number,
    required: true
  },
  appliances: [{
    type: String,
    required: true
  }],
  preferences: {
    notifications: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      default: 'light'
    }
  }
}, { timestamps: true });

// Pre-save hook to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get user's carbon footprint
UserSchema.methods.getCarbonFootprint = async function() {
  // This will be implemented with actual calculation logic
  return {
    total: 0,
    breakdown: {
      electricity: 0,
      transportation: 0,
      waste: 0,
      water: 0
    }
  };
};

module.exports = mongoose.model('User', UserSchema); 