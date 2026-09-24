/**
 * Query-string parsing for list endpoints. Every list endpoint in this API is
 * paginated — an unbounded "return everything" is not a shape this API offers.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Whitelist of sortable fields per resource, so ?sort cannot be an injection. */
const parsePagination = (query = {}, allowedSort = []) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));

  let sort = { createdAt: -1 };
  if (query.sort) {
    const descending = query.sort.startsWith('-');
    const field = descending ? query.sort.slice(1) : query.sort;
    if (allowedSort.includes(field)) sort = { [field]: descending ? -1 : 1 };
  }

  return { page, limit, skip: (page - 1) * limit, sort };
};

const paginated = (items, total, { page, limit }) => ({
  items,
  pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1
  }
});

module.exports = { parsePagination, paginated, DEFAULT_LIMIT, MAX_LIMIT };
