const mongoose = require('mongoose');

/** Resting limit/stop orders. Fills happen later, through the trading engine. */
const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    symbol: { type: String, required: true, uppercase: true },
    orderType: { type: String, enum: ['limit', 'stop'], required: true },
    direction: { type: String, enum: ['buy', 'sell'], required: true },
    targetPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0.00000001 },
    /**
     * pending    — waiting for the price condition
     * processing — claimed by the resolver (the claim IS the lock)
     * filled | cancelled | rejected
     */
    status: { type: String, enum: ['pending', 'processing', 'filled', 'cancelled', 'rejected'], default: 'pending' },
    filledPrice: { type: Number },
    filledAt: { type: Date },
    cancelledAt: { type: Date },
    processingAt: { type: Date },
    cancelReason: { type: String },
    lastError: { type: String },
    idempotencyKey: { type: String }
  },
  { timestamps: true }
);

orderSchema.index({ status: 1, createdAt: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
// Same idempotency contract as transactions: a retried submit returns the original.
orderSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

module.exports = mongoose.model('Order', orderSchema);
