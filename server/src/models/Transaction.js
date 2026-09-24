const mongoose = require('mongoose');

/**
 * The ledger. Append-only: it records what happened, never a mutable balance.
 * Cash and holdings are derived from these rows, so the ledger is the source
 * of truth and any figure on screen can be reconciled against it.
 */
const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  symbol: { type: String, required: true, uppercase: true },
  type: { type: String, enum: ['buy', 'sell'], required: true },
  orderType: { type: String, enum: ['market', 'limit', 'stop'], required: true },
  quantity: { type: Number, required: true, min: 0.00000001 },
  price: { type: Number, required: true, min: 0 },
  // Notional (quantity * price) excluding fees, stored so the ledger is readable
  // without recomputing, and fees are recorded separately.
  grossValue: { type: Number, required: true, min: 0 },
  fee: { type: Number, required: true, min: 0, default: 0 },
  // Signed: realized profit on a sell, measured against avgCostBasis. Zero for buys.
  realizedPnl: { type: Number, default: 0 },
  // Cash after this entry, so the running balance is auditable line by line.
  cashBalanceAfter: { type: Number, required: true },
  status: { type: String, enum: ['executed', 'failed'], required: true, default: 'executed' },
  // Idempotency: a retried request reuses its key, the unique index rejects the
  // duplicate write, and the caller gets the original transaction back.
  idempotencyKey: { type: String },
  timestamp: { type: Date, default: Date.now }
});

// Sparse so ordinary trades without a client-supplied key are unaffected.
transactionSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);
transactionSchema.index({ userId: 1, timestamp: -1 });

/**
 * Append-only enforcement at the schema level. Nothing in the application
 * exposes an update or delete route, and this makes that guarantee structural
 * rather than a convention someone can forget.
 */
const blockMutation = function (next) {
  if (process.env.NODE_ENV === 'test') return next(); // suites must be able to clean up
  next(new Error('Transactions are immutable and cannot be modified or deleted'));
};

['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'replaceOne'].forEach(
  (op) => transactionSchema.pre(op, blockMutation)
);

module.exports = mongoose.model('Transaction', transactionSchema);
