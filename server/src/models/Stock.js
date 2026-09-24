const mongoose = require('mongoose');

/** The tradable universe. Admin-managed; delisting keeps the row for history. */
const stockSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    sector: { type: String, trim: true, default: 'Unclassified' },
    exchange: { type: String, required: true, uppercase: true },
    currentPrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    delistedAt: { type: Date },
    lastUpdated: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

stockSchema.index({ sector: 1, isActive: 1 });

module.exports = mongoose.model('Stock', stockSchema);
