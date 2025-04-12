const mongoose = require('mongoose');

const iotDeviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['smart_meter', 'thermostat', 'ev_charger', 'water_meter', 'waste_sensor'],
    required: true
  },
  manufacturer: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'error'],
    default: 'active'
  },
  lastReading: {
    value: Number,
    unit: String,
    timestamp: Date
  },
  settings: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  dataPoints: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    value: Number,
    unit: String,
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
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
iotDeviceSchema.index({ userId: 1, deviceId: 1 });
iotDeviceSchema.index({ type: 1, status: 1 });

// Method to add new data point
iotDeviceSchema.methods.addDataPoint = async function(data) {
  this.dataPoints.push({
    timestamp: new Date(),
    value: data.value,
    unit: data.unit,
    metadata: data.metadata || {}
  });
  
  this.lastReading = {
    value: data.value,
    unit: data.unit,
    timestamp: new Date()
  };
  
  this.lastUpdated = new Date();
  await this.save();
  return this;
};

// Method to get recent data points
iotDeviceSchema.methods.getRecentData = async function(limit = 100) {
  return this.dataPoints
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
};

// Method to calculate average consumption
iotDeviceSchema.methods.calculateAverage = async function(startDate, endDate) {
  const relevantData = this.dataPoints.filter(point => 
    point.timestamp >= startDate && point.timestamp <= endDate
  );
  
  if (relevantData.length === 0) return 0;
  
  const sum = relevantData.reduce((total, point) => total + point.value, 0);
  return sum / relevantData.length;
};

const IoTDevice = mongoose.model('IoTDevice', iotDeviceSchema);

module.exports = IoTDevice; 