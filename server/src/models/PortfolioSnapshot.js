const mongoose = require('mongoose');

/** Daily portfolio value per user — the series the performance chart reads. */
const portfolioSnapshotSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true, expires: '90d' },
    totalValue: { type: Number, required: true },
    cashBalance: { type: Number, required: true },
    holdingsValue: { type: Number, required: true },
    capturedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

portfolioSnapshotSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('PortfolioSnapshot', portfolioSnapshotSchema);
