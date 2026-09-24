const PortfolioSnapshot = require('../models/PortfolioSnapshot');

/**
 * Snapshot model access. Portfolio value history is stored, not recomputed:
 * a chartable series cannot be reconstructed from the current holdings alone,
 * and recomputing a year of history on every page load is not a real option.
 */
const recordSnapshot = async ({ userId, totalValue, cashBalance, holdingsValue, date = new Date() }) => {
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);

  // One snapshot per user per day; a later run updates the same row.
  return PortfolioSnapshot.findOneAndUpdate(
    { userId, date: day },
    { $set: { totalValue, cashBalance, holdingsValue, capturedAt: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

/** Chronological snapshots for charting, oldest first. */
const getHistory = async (userId, { days = 90 } = {}) => {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);

  return PortfolioSnapshot.find({ userId, date: { $gte: since } }).sort({ date: 1 }).lean();
};

module.exports = { recordSnapshot, getHistory };
