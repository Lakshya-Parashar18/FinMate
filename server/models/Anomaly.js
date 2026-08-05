import mongoose from 'mongoose';

const anomalySchema = new mongoose.Schema({
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isAnomaly: {
    type: Boolean,
    required: true
  },
  anomalyScore: {
    type: Number,
    required: true
  },
  severity: {
    type: String,
    enum: ['none', 'low', 'medium', 'high'],
    required: true,
    default: 'none'
  },
  reasons: [
    {
      type: String
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexing for rapid lookup by user (transaction is indexed via unique: true)
anomalySchema.index({ user: 1 });

const Anomaly = mongoose.model('Anomaly', anomalySchema);

export default Anomaly;
