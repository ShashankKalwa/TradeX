const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  period: { type: String, enum: ['daily', 'weekly', 'all_time'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  returnPct: { type: Number, required: true },
  rank: { type: Number, required: true },
  computedAt: { type: Date, default: Date.now }
});

// Index for fast querying by period and rank
leaderboardSchema.index({ period: 1, rank: 1 });

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
