const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, uppercase: true },
    quantity: { type: Number, required: true, min: 0 },
    avgCostBasis: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const portfolioSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    cashBalance: { type: Number, required: true, default: 0, min: 0 },
    holdings: { type: [holdingSchema], default: [] }
  },
  {
    timestamps: true,
    // THE concurrency guarantee. Mongoose compares __v on save() and throws a
    // VersionError if another writer got there first. A hand-rolled `version`
    // number field does NOT do this — only this option does.
    optimisticConcurrency: true
  }
);

// Supports the leaderboard sweep without scanning every portfolio.
portfolioSchema.index({ updatedAt: 1 });

module.exports = mongoose.model('Portfolio', portfolioSchema);
