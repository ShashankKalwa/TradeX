const yahooFinanceProvider = require('../../src/integrations/providers/yahooFinanceProvider');
const YahooFinance = require('yahoo-finance2').default;

jest.mock('yahoo-finance2', () => {
  class MockYahooFinance {
    quote = jest.fn();
    historical = jest.fn();
  }
  return {
    default: MockYahooFinance
  };
});

// Since the provider creates an instance inside, we need to get the instance method.
// Actually, in the test, it requires the module, so let's check how it tests.

describe('Yahoo Finance Provider', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuote', () => {
    it('appends .NS for Indian stocks and fetches quote', async () => {
      yahooFinance.quote.mockResolvedValueOnce({
        regularMarketPrice: 2500,
        regularMarketPreviousClose: 2450,
        regularMarketChange: 50,
        regularMarketChangePercent: 2.04,
        currency: 'INR',
        exchange: 'NSE'
      });

      const quote = await yahooFinanceProvider.getQuote('RELIANCE');
      expect(yahooFinance.quote).toHaveBeenCalledWith('RELIANCE.NS');
      expect(quote).toMatchObject({
        symbol: 'RELIANCE',
        price: 2500,
        stale: false,
        source: 'yahoo-finance2'
      });
    });

    it('does not append .NS for known US stocks', async () => {
      yahooFinance.quote.mockResolvedValueOnce({ regularMarketPrice: 150 });
      await yahooFinanceProvider.getQuote('AAPL');
      expect(yahooFinance.quote).toHaveBeenCalledWith('AAPL');
    });

    it('throws cleanly if yahoo-finance throws', async () => {
      yahooFinance.quote.mockRejectedValueOnce(new Error('Network Error'));
      await expect(yahooFinanceProvider.getQuote('TCS')).rejects.toThrow('Network Error');
    });
  });

  describe('subscribeTicks', () => {
    it('throws because streaming is unsupported', async () => {
      await expect(yahooFinanceProvider.subscribeTicks()).rejects.toThrow('does not implement streaming');
      expect(yahooFinanceProvider.supportsStreaming()).toBe(false);
    });
  });
});
