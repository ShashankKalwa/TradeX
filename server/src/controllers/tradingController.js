const tradingEngineService = require('../services/tradingEngineService');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');
const { parsePagination, paginated } = require('../utils/pagination');

/**
 * @openapi
 * tags:
 *   - name: Trading
 *     description: Order placement, the resting-order queue, and the transaction ledger
 */

/**
 * @openapi
 * /trade/market:
 *   post:
 *     summary: Execute a market order at the live price
 *     description: >
 *       Runs inside a MongoDB transaction with optimistic locking on the
 *       portfolio, so two concurrent requests can never both spend the same
 *       cash. Send an Idempotency-Key header to make retries safe.
 *     tags: [Trading]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: header
 *         name: Idempotency-Key
 *         schema: { type: string }
 *         description: Reusing a key returns the original fill instead of trading again
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol, side, quantity]
 *             properties:
 *               symbol: { type: string, example: RELIANCE }
 *               side: { type: string, enum: [buy, sell] }
 *               quantity: { type: number, minimum: 0.00000001, example: 10 }
 *     responses:
 *       201: { description: Order filled and written to the ledger }
 *       400: { description: Insufficient funds or holdings, or invalid input }
 *       503: { description: No market price available for the symbol }
 */
const executeMarketOrder = asyncHandler(async (req, res) => {
  const { symbol, side, quantity } = req.body;

  const result = await tradingEngineService.executeMarketOrder(req.user._id, symbol, side, quantity, {
    idempotencyKey: req.get('Idempotency-Key')
  });

  res.status(201).json({
    success: true,
    data: {
      transaction: result.transaction,
      cashBalance: result.portfolio.cashBalance,
      holdings: result.portfolio.holdings,
      replayed: result.replayed
    }
  });
});

/**
 * @openapi
 * /trade/orders:
 *   post:
 *     summary: Place a resting limit or stop order
 *     description: Reserves nothing. Funds and holdings are checked when the order actually fills.
 *     tags: [Trading]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol, orderType, direction, targetPrice, quantity]
 *             properties:
 *               symbol: { type: string, example: INFY }
 *               orderType: { type: string, enum: [limit, stop] }
 *               direction: { type: string, enum: [buy, sell] }
 *               targetPrice: { type: number, example: 1500 }
 *               quantity: { type: number, example: 5 }
 *     responses:
 *       201: { description: Order resting in the queue }
 */
const placePendingOrder = asyncHandler(async (req, res) => {
  const { symbol, orderType, direction, targetPrice, quantity } = req.body;

  const order = await tradingEngineService.placePendingOrder(
    req.user._id,
    symbol,
    orderType,
    direction,
    targetPrice,
    quantity,
    { idempotencyKey: req.get('Idempotency-Key') }
  );

  res.status(201).json({ success: true, data: order });
});

/**
 * @openapi
 * /trade/orders:
 *   get:
 *     summary: List your orders
 *     tags: [Trading]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [pending, processing, filled, cancelled, rejected] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *       - { in: query, name: sort, schema: { type: string, example: '-createdAt' } }
 *     responses:
 *       200: { description: Paginated orders }
 */
const listOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req.query, ['createdAt', 'targetPrice', 'symbol']);
  const orderedSort = req.query.sort ? sort : { createdAt: -1, _id: -1 };

  const filter = { userId: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.symbol) filter.symbol = String(req.query.symbol).toUpperCase();

  const [items, total] = await Promise.all([
    Order.find(filter).sort(orderedSort).skip(skip).limit(limit).lean(),
    Order.countDocuments(filter)
  ]);

  res.json({ success: true, data: paginated(items, total, { page, limit }) });
});

/**
 * @openapi
 * /trade/orders/{id}:
 *   delete:
 *     summary: Cancel a resting order
 *     tags: [Trading]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Order cancelled }
 *       404: { description: No pending order with that id }
 */
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await tradingEngineService.cancelOrder(req.user._id, req.params.id);
  res.json({ success: true, data: order });
});

/**
 * @openapi
 * /trade/transactions:
 *   get:
 *     summary: Your transaction ledger (append-only)
 *     tags: [Trading]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: symbol, schema: { type: string } }
 *       - { in: query, name: type, schema: { type: string, enum: [buy, sell] } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *     responses:
 *       200: { description: Paginated ledger entries, newest first }
 */
const listTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req.query, ['timestamp', 'grossValue', 'symbol']);
  // _id breaks ties between entries written in the same millisecond, so the
  // ledger's order is stable rather than whatever the storage engine returns.
  const orderedSort = req.query.sort ? sort : { timestamp: -1, _id: -1 };

  const filter = { userId: req.user._id };
  if (req.query.symbol) filter.symbol = String(req.query.symbol).toUpperCase();
  if (req.query.type) filter.type = req.query.type;

  const [items, total] = await Promise.all([
    Transaction.find(filter).sort(orderedSort).skip(skip).limit(limit).lean(),
    Transaction.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: {
      ...paginated(items, total, { page, limit }),
      // The ledger is append-only; say so in the payload rather than in a comment only.
      immutable: true
    }
  });
});

module.exports = { executeMarketOrder, placePendingOrder, listOrders, cancelOrder, listTransactions };
