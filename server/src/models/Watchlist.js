const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  symbol: { type: String, required: true, uppercase: true },
  targetPrice: { type: Number, required: true, min: 0 },
  direction: { type: String, enum: ['above', 'below'], required: true },
  status: { type: String, enum: ['active', 'triggered', 'cancelled'], default: 'active' }
}, { _id: true });

const watchlistSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  symbols: [{ type: String, uppercase: true }],
  alerts: [alertSchema]
});

module.exports = mongoose.model('Watchlist', watchlistSchema);
