/**
 * Money helpers. All persisted amounts are rounded to 2 decimal places so the
 * ledger reconciles exactly — floating point drift a fraction of a paisa at a
 * time is how a "correct" ledger stops matching the cash balance.
 */

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Round a share quantity to 4dp (fractional shares are allowed). */
const roundQty = (value) => Math.round((value + Number.EPSILON) * 10000) / 10000;

const { trading } = require('../config/env');

/** Brokerage for one side of a trade. */
const feeFor = (notional, feeRate = trading.feeRate) => round2(notional * feeRate);

/**
 * Recompute a holding's weighted-average cost basis after a buy.
 * Returns the new average, rounded, so it round-trips through the database.
 */
const newAverageCost = (existingQty, existingAvg, addedQty, addedPrice) => {
  const totalQty = existingQty + addedQty;
  if (totalQty <= 0) return 0;
  const totalCost = existingQty * existingAvg + addedQty * addedPrice;
  return round2(totalCost / totalQty);
};

/**
 * Realized P&L for a sell, measured against the holding's average cost basis.
 * Fees are charged against the result, so a "profitable" trade that only
 * covers its costs reports as a loss.
 */
const realizedPnl = (quantity, sellPrice, avgCostBasis, fee) =>
  round2((sellPrice - avgCostBasis) * quantity - fee);

module.exports = { round2, roundQty, feeFor, newAverageCost, realizedPnl };
