import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // We can store budgets per month/year
  month: {
    type: Number, // e.g., 0 for January, 11 for December
    required: true,
    min: 0,
    max: 11,
  },
  year: {
    type: Number,
    required: true,
  },
  // Overall monthly budget limit (optional)
  totalLimit: {
      type: Number,
      default: null, // Explicitly null if not set
  },
  // Budgets per category for that month
  categories: [
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      limit: {
        type: Number,
        required: true,
        min: 0,
      },
      // We might calculate spending dynamically based on transactions
      // rather than storing it here, to avoid sync issues.
      // spent: {
      //   type: Number,
      //   required: true,
      //   default: 0,
      // }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Index for efficient lookup of a user's budget for a specific month/year
budgetSchema.index({ user: 1, year: 1, month: 1 }, { unique: true });

const Budget = mongoose.model('Budget', budgetSchema);

export default Budget; 