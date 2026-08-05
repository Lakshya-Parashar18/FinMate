import mongoose from 'mongoose';

const budgetHistorySchema = new mongoose.Schema({
  month: String,
  spent: Number
}, { _id: false });

const budgetBreakdownSchema = new mongoose.Schema({
  name: String,
  value: Number,
  color: String
}, { _id: false });

const circleBudgetSchema = new mongoose.Schema({
  limit: {
    type: Number,
    default: 1000
  },
  spent: {
    type: Number,
    default: 0
  },
  history: {
    type: [budgetHistorySchema],
    default: []
  },
  breakdown: {
    type: [budgetBreakdownSchema],
    default: []
  }
}, { _id: false });

const circleGoalSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  target: {
    type: Number,
    required: true
  },
  current: {
    type: Number,
    default: 0
  },
  deadline: {
    type: String,
    default: 'No deadline'
  },
  contributor: {
    type: String,
    default: 'Shared'
  }
}, { _id: false });

const rankingSchema = new mongoose.Schema({
  name: String,
  score: Number,
  position: Number
}, { _id: false });

const circleChallengeSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  target: {
    type: Number,
    required: true
  },
  rankings: {
    type: [rankingSchema],
    default: []
  }
}, { _id: false });

const circleExpenseSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    default: 'Food'
  },
  paidById: {
    type: String, // Can store "you" or userId
    required: true
  },
  date: {
    type: String,
    required: true
  },
  splitType: {
    type: String,
    enum: ['equal', 'exact', 'percentage', 'shares'],
    default: 'equal'
  },
  splits: {
    type: Map,
    of: String // userId -> splitAmount
  },
  members: {
    type: [String], // Array of memberIds involved in this expense
    default: []
  }
}, { _id: false });

const circleActivitySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'system' // 'expense', 'goal', 'challenge', 'budget', 'system'
  },
  message: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: 'blue' // 'green', 'blue', 'yellow', 'purple', 'red'
  }
}, { _id: false });

const circleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: 'Collaborative finance circle.'
    },
    icon: {
      type: String,
      default: '✈'
    },
    themeColor: {
      type: String,
      default: '#f59e0b'
    },
    coverGradient: {
      type: String,
      default: 'linear-gradient(135deg, #f59e0b, #1e293b)'
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    budget: {
      type: circleBudgetSchema,
      default: () => ({ limit: 1000, spent: 0, history: [], breakdown: [] })
    },
    goals: {
      type: [circleGoalSchema],
      default: []
    },
    challenges: {
      type: [circleChallengeSchema],
      default: []
    },
    expenses: {
      type: [circleExpenseSchema],
      default: []
    },
    activity: {
      type: [circleActivitySchema],
      default: []
    },
    lastActive: {
      type: String,
      default: 'Just now'
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Circle', circleSchema);
