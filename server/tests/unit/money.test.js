const { round2, roundQty, feeFor, newAverageCost, realizedPnl } = require('../../src/utils/money');
const { parsePagination, paginated } = require('../../src/utils/pagination');
const { scrub } = require('../../src/middleware/sanitize');

/** Money arithmetic underpins every balance in the system, so it is pinned. */
describe('money', () => {
  it('rounds to two decimal places without float dust', () => {
    // 0.1 + 0.2 style drift is what makes a "correct" ledger stop reconciling.
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
  });

  it('rounds quantities to four decimal places', () => {
    expect(roundQty(1.00005)).toBe(1.0001);
    expect(roundQty(0.123456)).toBe(0.1235);
  });

  it('charges a fee on the notional', () => {
    expect(feeFor(1000, 0.0005)).toBe(0.5);
    expect(feeFor(1999.99, 0.0005)).toBe(1);
  });

  it('computes a weighted average cost basis across buys', () => {
    expect(newAverageCost(10, 100, 10, 200)).toBe(150);
    expect(newAverageCost(0, 0, 5, 80)).toBe(80);
  });

  it('returns zero for a zero-quantity average rather than dividing by zero', () => {
    expect(newAverageCost(0, 0, 0, 100)).toBe(0);
  });

  it('measures realized P&L net of fees', () => {
    expect(realizedPnl(10, 150, 100, 0.75)).toBe(499.25);
    expect(realizedPnl(10, 80, 100, 0.4)).toBe(-200.4);
  });

  it('treats a price move that only covers fees as a loss', () => {
    expect(realizedPnl(100, 100.01, 100, 5)).toBeLessThan(0);
  });
});

describe('pagination', () => {
  it('applies defaults', () => {
    const { page, limit, skip } = parsePagination();
    expect(page).toBe(1);
    expect(limit).toBe(20);
    expect(skip).toBe(0);
  });

  it('caps the page size so a caller cannot ask for everything', () => {
    expect(parsePagination({ limit: '100000' }).limit).toBe(100);
  });

  it('ignores a sort field outside the whitelist', () => {
    // A sort parameter reaching Mongo unchecked is an injection vector.
    expect(parsePagination({ sort: 'passwordHash' }, ['symbol']).sort).toEqual({ createdAt: -1 });
    expect(parsePagination({ sort: 'symbol' }, ['symbol']).sort).toEqual({ symbol: 1 });
    expect(parsePagination({ sort: '-symbol' }, ['symbol']).sort).toEqual({ symbol: -1 });
  });

  it('describes the page envelope', () => {
    expect(paginated([1, 2], 5, { page: 2, limit: 2 })).toEqual({
      items: [1, 2],
      pagination: { page: 2, limit: 2, total: 5, pages: 3 }
    });
  });
});

describe('NoSQL injection sanitisation', () => {
  it('strips operator keys from a nested body', () => {
    const result = scrub({ email: { $gt: '' }, password: 'x' });
    expect(result).toEqual({ email: {}, password: 'x' });
  });

  it('strips dotted keys that would become path traversal', () => {
    expect(scrub({ 'user.role': 'admin', name: 'ok' })).toEqual({ name: 'ok' });
  });

  it('sanitises inside arrays', () => {
    expect(scrub({ items: [{ $where: 'x', keep: 1 }] })).toEqual({ items: [{ keep: 1 }] });
  });

  it('leaves ordinary payloads untouched', () => {
    const payload = { symbol: 'AAA', quantity: 5, nested: { ok: true } };
    expect(scrub(payload)).toEqual(payload);
  });
});
