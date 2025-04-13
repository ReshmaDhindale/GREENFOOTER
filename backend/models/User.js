const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Emission schema for carbon footprint records
const EmissionSchema = new mongoose.Schema({
  value: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  details: {
    type: Object,
    default: {}
  }
});

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
    type: String
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
  emissions: [EmissionSchema],
  averageCarbonFootprint: {
    type: Number,
    default: 0
  },
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
  if (!this.emissions || this.emissions.length === 0) {
    return {
      total: 0,
      average: 0,
      breakdown: {
        electricity: 0,
        transportation: 0,
        waste: 0,
        water: 0
      }
    };
  }
  
  // Calculate totals from emission records
  const total = this.emissions.reduce((sum, emission) => sum + emission.value, 0);
  const average = total / this.emissions.length;
  
  // Calculate breakdown if details are available
  const breakdown = {
    electricity: 0,
    transportation: 0,
    waste: 0,
    water: 0
  };
  
  // Try to populate breakdown from emission details
  this.emissions.forEach(emission => {
    if (emission.details) {
      Object.keys(breakdown).forEach(key => {
        if (emission.details[key]) {
          breakdown[key] += emission.details[key];
        }
      });
    }
  });
  
  return {
    total,
    average,
    breakdown
  };
};

module.exports = mongoose.model('User', UserSchema); 