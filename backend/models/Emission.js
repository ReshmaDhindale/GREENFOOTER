const mongoose = require('mongoose');

const EmissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family'
  },
  date: {
    type: Date,
    default: Date.now
  },
  category: {
    type: String,
    enum: ['energy', 'transportation', 'water', 'waste', 'diet', 'shopping'],
    required: true
  },
  subcategory: {
    type: String
  },
  value: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    default: 'kg'
  },
  source: {
    type: String,
    enum: ['manual', 'iot', 'import', 'calculation'],
    default: 'manual'
  },
  details: {
    // For energy category
    bulbCount: Number,
    bulbWattage: Number,
    bulbHours: Number,
    
    // For transportation category
    vehicleType: String,
    distance: Number,
    
    // For water category
    showerMinutes: Number,
    laundryLoads: Number,
    
    // For waste category
    trashBags: Number,
    
    // For diet category
    dietType: String,
    
    // For shopping category
    clothingPurchases: Number,
    electronicsPurchases: Number
  }
}, { timestamps: true });

// Method to calculate CO2 equivalent for this emission
EmissionSchema.methods.calculateCO2Equivalent = function() {
  let co2 = 0;
  
  switch (this.category) {
    case 'energy':
      co2 = (this.details.bulbCount * this.details.bulbWattage * this.details.bulbHours * 0.001);
      break;
    case 'transportation':
      // Different coefficients based on vehicle type
      const coefficients = {
        car: 0.21,
        motorbike: 0.12,
        public: 0.05,
        ev: 0.08
      };
      const coefficient = coefficients[this.details.vehicleType] || 0.21;
      co2 = this.details.distance * coefficient;
      break;
    case 'water':
      co2 = (this.details.showerMinutes * 0.05) + (this.details.laundryLoads * 0.7);
      break;
    case 'waste':
      co2 = this.details.trashBags * 0.3;
      break;
    // Additional calculations for other categories would go here
  }
  
  return co2;
};

// Static method to get a user's total emissions
EmissionSchema.statics.getUserTotal = async function(userId, period = 'all') {
  let dateFilter = {};
  
  // Handle different time periods
  if (period === 'day') {
    const today = new Date();
    dateFilter = {
      $gte: new Date(today.setHours(0, 0, 0, 0)),
      $lt: new Date(today.setHours(23, 59, 59, 999))
    };
  } else if (period === 'week') {
    const today = new Date();
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);
    dateFilter = { $gte: startOfWeek };
  } else if (period === 'month') {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    dateFilter = { $gte: startOfMonth };
  }
  
  const query = { userId };
  if (Object.keys(dateFilter).length > 0) {
    query.date = dateFilter;
  }
  
  const result = await this.aggregate([
    { $match: query },
    { $group: {
      _id: '$category',
      total: { $sum: '$value' }
    }},
    { $group: {
      _id: null,
      categories: { $push: { category: '$_id', total: '$total' } },
      totalEmissions: { $sum: '$total' }
    }}
  ]);
  
  return result[0] || { totalEmissions: 0, categories: [] };
};

module.exports = mongoose.model('Emission', EmissionSchema); 