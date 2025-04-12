const mongoose = require('mongoose');

const RecommendationSchema = new mongoose.Schema({
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
    enum: ['energy', 'transportation', 'water', 'waste', 'diet', 'shopping'],
    required: true
  },
  impactLevel: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  potentialSavings: {
    co2: {
      type: Number,
      required: true
    },
    cost: {
      type: Number,
      default: 0
    },
    unit: {
      type: String,
      default: 'kg'
    }
  },
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'hard'],
    default: 'moderate'
  },
  timeFrame: {
    type: String,
    enum: ['immediate', 'short-term', 'long-term'],
    default: 'short-term'
  },
  imageUrl: {
    type: String
  },
  externalLinks: [{
    title: String,
    url: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Static method to get personalized recommendations based on user data
RecommendationSchema.statics.getPersonalizedRecommendations = async function(userId, limit = 5) {
  try {
    // Get user's emission data
    const Emission = mongoose.model('Emission');
    const userEmissions = await Emission.getUserTotal(userId);
    
    // Find the categories with highest emissions
    const highEmissionCategories = userEmissions.categories
      .sort((a, b) => b.total - a.total)
      .slice(0, 2)
      .map(item => item.category);
    
    // Get recommendations for those categories
    let recommendations = [];
    
    if (highEmissionCategories.length > 0) {
      recommendations = await this.find({
        category: { $in: highEmissionCategories },
        isActive: true
      })
      .sort({ potentialSavings: -1 })
      .limit(limit);
    }
    
    // If not enough recommendations, add some general ones
    if (recommendations.length < limit) {
      const generalRecs = await this.find({
        category: { $nin: highEmissionCategories },
        isActive: true
      })
      .sort({ potentialSavings: -1 })
      .limit(limit - recommendations.length);
      
      recommendations = [...recommendations, ...generalRecs];
    }
    
    return recommendations;
  } catch (err) {
    console.error('Error getting personalized recommendations:', err);
    // Return general recommendations as fallback
    return await this.find({ isActive: true }).limit(limit);
  }
};

module.exports = mongoose.model('Recommendation', RecommendationSchema); 