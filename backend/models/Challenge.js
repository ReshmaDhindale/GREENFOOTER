const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['energy', 'transportation', 'waste', 'water', 'diet', 'shopping'],
    required: true
  },
  type: {
    type: String,
    enum: ['individual', 'family', 'community'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  duration: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  goals: [{
    metric: String,
    target: Number,
    unit: String
  }],
  rewards: {
    points: {
      type: Number,
      required: true
    },
    badges: [String],
    achievements: [String]
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    progress: {
      type: Map,
      of: Number
    },
    status: {
      type: String,
      enum: ['joined', 'in_progress', 'completed', 'dropped'],
      default: 'joined'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  leaderboard: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    score: Number,
    rank: Number
  }],
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  requirements: {
    minAge: Number,
    maxParticipants: Number,
    prerequisites: [String]
  },
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
challengeSchema.index({ category: 1, type: 1 });
challengeSchema.index({ status: 1, 'duration.startDate': 1 });

// Method to join challenge
challengeSchema.methods.joinChallenge = async function(userId) {
  if (this.participants.length >= this.requirements.maxParticipants) {
    throw new Error('Challenge is full');
  }

  if (this.participants.some(p => p.userId.toString() === userId.toString())) {
    throw new Error('User already joined this challenge');
  }

  this.participants.push({
    userId,
    progress: new Map(),
    status: 'joined'
  });

  await this.save();
  return this;
};

// Method to update progress
challengeSchema.methods.updateProgress = async function(userId, progress) {
  const participant = this.participants.find(p => p.userId.toString() === userId.toString());
  if (!participant) {
    throw new Error('User not found in challenge');
  }

  participant.progress = new Map([...participant.progress, ...progress]);
  await this.save();
  return this;
};

// Method to calculate leaderboard
challengeSchema.methods.calculateLeaderboard = async function() {
  const participants = this.participants
    .filter(p => p.status !== 'dropped')
    .map(p => ({
      userId: p.userId,
      score: Array.from(p.progress.values()).reduce((sum, val) => sum + val, 0)
    }))
    .sort((a, b) => b.score - a.score);

  this.leaderboard = participants.map((p, index) => ({
    userId: p.userId,
    score: p.score,
    rank: index + 1
  }));

  await this.save();
  return this.leaderboard;
};

// Static method to get active challenges
challengeSchema.statics.getActiveChallenges = async function() {
  const now = new Date();
  return this.find({
    status: 'active',
    'duration.startDate': { $lte: now },
    'duration.endDate': { $gte: now }
  });
};

const Challenge = mongoose.model('Challenge', challengeSchema);

module.exports = Challenge; 