import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { placeOrder, clearOrderResult } from '../app/bookSlice.js'
import { setSkipVerification } from '../app/sessionSlice.js'
import { bySymbol, FEE_RATE } from '../data/universe.js'
import { money } from '../lib/format.js'
import Icon from './Icon.jsx'
import { money as fmtMoney } from '../lib/format.js'

/**
 * The order ticket — a real perforated form. Market orders fill instantly and
 * get the rubber stamp; limit/stop orders rest with the scheduler and get a
 * "RESTING" registration stamp. Rejections print as a rejection slip.
 */
export default function OrderTicket({ symbol, heldQty = 0 }) {
  const dispatch = useDispatch()
  const book = useSelector((s) => s.book)
  const market = useSelector((s) => s.market)
  const session = useSelector((s) => s.session)
  const region = book.region
  const quote = market.quotes[symbol]
  const stock = bySymbol(symbol)

  const [side, setSide] = useState('BUY')
  const [type, setType] = useState('MARKET')
  const [qty, setQty] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [note, setNote] = useState('')
  const [localError, setLocalError] = useState('')
  const [errorField, setErrorField] = useState(null) // 'qty' | 'price' | null

  useEffect(() => {
    // reset when the symbol changes
    setQty('')
    setLimitPrice('')
    setStopPrice('')
    setNote('')
    setLocalError('')
    dispatch(clearOrderResult())
  }, [symbol, dispatch])

  const execPrice = type === 'LIMIT' && Number(limitPrice) > 0 ? Number(limitPrice) : quote?.price || 0
  const qtyN = Math.floor(Number(qty)) || 0
  const estValue = qtyN * execPrice
  const estFee = estValue * FEE_RATE
  const estTotal = side === 'BUY' ? estValue + estFee : estValue - estFee

  const result = book.lastResult
  const showStamp = book.orderStatus === 'done' && result && result.order?.symbol === symbol

  useEffect(() => {
    if (showStamp) {
      const t = setTimeout(() => dispatch(clearOrderResult()), 4200)
      return () => clearTimeout(t)
    }
  }, [showStamp, dispatch])

  const submit = async (e) => {
    e.preventDefault()
    if (!session.user?.isVerified) {
      dispatch(setSkipVerification(false)) // show the verification modal again
      return
    }
    setLocalError('')
    setErrorField(null)
    if (!qtyN || qtyN < 1) {
      setLocalError('Quantity must be at least 1 share.')
      setErrorField('qty')
      return
    }
    if (type === 'LIMIT' && !(Number(limitPrice) > 0)) {
      setLocalError('A limit order needs a limit price.')
      setErrorField('price')
      return
    }
    if (type === 'STOP' && !(Number(stopPrice) > 0)) {
      setLocalError('A stop order needs a stop price.')
      setErrorField('price')
      return
    }
    const key = `${symbol}:${side}:${type}:${qtyN}:${Date.now()}`
    try {
      await dispatch(
        placeOrder({
          region,
          symbol,
          side,
          type,
          qty: qtyN,
          limitPrice: type === 'LIMIT' ? Number(limitPrice) : undefined,
          stopPrice: type === 'STOP' ? Number(stopPrice) : undefined,
          idempotencyKey: key,
          note
        })
      ).unwrap()
      setQty('')
      setNote('')
    } catch (err) {
      // validation errors render on the rejection slip below
    }
  }

  const error = localError || book.orderError

  return (
    <div className="relative">
      <form
        onSubmit={submit}
        className="paper-ticket paper relative rounded-ticket shadow-paper-lift overflow-visible"
        aria-label={`Order ticket for ${symbol}`}
      >
        {/* Ticket header — the stub */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-dashed border-rule-strong/70 bg-rule/10 tear-bottom">
          <div className="flex items-center gap-2">
            <Icon name="ticket" size={17} className="text-ink-secondary" />
            <span className="font-bold text-xs tracking-[0.12em] uppercase text-ink">Order Ticket</span>
          </div>
          <span className="num text-2xs text-ink-muted">
            {symbol} · {stock?.exchange}
          </span>
        </div>

        <div className="p-4 space-y-4">
          {/* Side */}
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Side">
            {['BUY', 'SELL'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSide(s)}
                aria-pressed={side === s}
                className={`rounded-ticket py-2 text-sm font-bold tracking-wider transition-all ${
                  side === s
                    ? s === 'BUY'
                      ? 'bg-buy-text text-paper-50 shadow-stamp'
                      : 'bg-sell-text text-paper-50 shadow-stamp'
                    : 'bg-transparent text-ink-secondary border border-rule hover:border-rule-strong'
                }`}
              >
                {s}
                {s === 'SELL' && heldQty > 0 && <span className="num text-2xs font-normal ml-1.5 opacity-70">/{heldQty}</span>}
              </button>
            ))}
          </div>

          {/* Order type */}
          <div className="flex gap-1 rounded-ticket bg-rule/20 p-1" role="group" aria-label="Order type">
            {['MARKET', 'LIMIT', 'STOP'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={`flex-1 rounded-ticket py-1.5 text-2xs font-semibold tracking-wider font-mono transition-colors ${
                  type === t ? 'bg-paper-50 text-ink shadow-paper' : 'text-ink-secondary hover:text-ink'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Price line */}
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-ink-secondary">{type === 'MARKET' ? 'Market price' : type === 'LIMIT' ? 'Limit' : 'Stop'}</span>
            {type === 'MARKET' ? (
              <span className="num text-sm font-semibold text-ink">{quote ? money(quote.price, region) : '—'}</span>
            ) : (
              <input
                className="field num !w-32 text-right"
                inputMode="decimal"
                placeholder="0.00"
                aria-invalid={errorField === 'price'}
                value={type === 'LIMIT' ? limitPrice : stopPrice}
                onChange={(e) => (type === 'LIMIT' ? setLimitPrice(e.target.value) : setStopPrice(e.target.value))}
                aria-label={type === 'LIMIT' ? 'Limit price' : 'Stop price'}
              />
            )}
          </div>

          {/* Quantity */}
          <label className="block">
            <span className="text-xs text-ink-secondary">Quantity (shares)</span>
            <input
              className="field num mt-1"
              inputMode="numeric"
              placeholder="0"
              aria-invalid={errorField === 'qty'}
              value={qty}
              onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ''))}
              aria-label="Quantity in shares"
            />
          </label>

          {/* Quick qty chips */}
          <div className="flex gap-1.5 flex-wrap">
            {[1, 5, 10, 25, 50].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setQty(String(n))}
                className="num text-2xs px-2 py-1 rounded-ticket border border-rule text-ink-secondary hover:border-accent-text hover:text-accent-text transition-colors"
              >
                {n}
              </button>
            ))}
            {heldQty > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSide('SELL')
                  setQty(String(heldQty))
                }}
                className="text-2xs px-2 py-1 rounded-ticket border border-sell-text/50 text-sell-text hover:bg-sell-text/10 transition-colors font-semibold"
              >
                ALL {heldQty}
              </button>
            )}
          </div>

          {/* Note */}
          <label className="block">
            <span className="text-xs text-ink-secondary">Ticket note <span className="text-ink-muted">(optional)</span></span>
            <input className="field mt-1" maxLength={60} placeholder="Why this trade…" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>

          {/* Cost preview */}
          {qtyN > 0 && execPrice > 0 && (
            <dl className="num text-2xs space-y-1 border-t border-dashed border-rule-strong/60 pt-3 text-ink-secondary">
              <div className="flex justify-between">
                <dt>Est. value</dt>
                <dd>{money(estValue, region)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Fee (0.05%)</dt>
                <dd>{money(estFee, region)}</dd>
              </div>
              <div className="flex justify-between text-ink font-semibold text-xs pt-0.5">
                <dt>{side === 'BUY' ? 'Total debit' : 'Net credit'}</dt>
                <dd>{money(estTotal, region)}</dd>
              </div>
            </dl>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={book.orderStatus === 'submitting'}
            className={`w-full rounded-ticket py-2.5 text-sm font-bold tracking-wider uppercase shadow-paper transition-all hover:shadow-paper-lift active:translate-y-px disabled:opacity-60 ${
              side === 'BUY' ? 'bg-buy-text text-paper-50' : 'bg-sell-text text-paper-50'
            }`}
          >
            {book.orderStatus === 'submitting' ? 'FILING…' : `${side} ${qtyN || ''} ${type === 'MARKET' ? 'AT MARKET' : type}`}
          </button>

          <p className="text-2xs text-ink-muted leading-relaxed">
            Virtual funds only. Fills are simulated at the live feed price and written once to your ledger — retries can't double-spend.
          </p>
        </div>
      </form>

      {/* ---------- The stamp ---------- */}
      {showStamp && result && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none rounded-ticket bg-paper-50/85 px-3"
          aria-live="polite"
        >
          <div className="animate-stamp-press w-full max-w-[19rem] bg-paper-50 rounded-ticket shadow-paper px-4 py-5 text-center">
            {result.status === 'FILLED' ? (
              <>
                <span
                  className={`stamp text-2xl px-3 py-1.5 ${result.order.side === 'BUY' ? 'stamp-buy' : 'stamp-sell'}`}
                >
                  {result.order.side} · FILLED
                </span>
                <span className="num block text-2xs font-semibold tracking-[0.1em] text-ink mt-3">
                  {result.order.qty} SHARES @ {fmtMoney(result.order.filledPrice, region)}
                </span>
                <span className="block text-2xs tracking-wider text-ink-secondary mt-1.5">
                  WRITTEN TO LEDGER · {result.order.id}
                </span>
              </>
            ) : (
              <>
                <span className="stamp stamp-neutral text-2xl px-3 py-1.5">{result.order.type} · RESTING</span>
                <span className="num block text-2xs font-semibold tracking-[0.1em] text-ink mt-3">
                  {result.order.qty} SHARES UNTIL FEED CROSSES{' '}
                  {result.order.type === 'LIMIT' ? result.order.limitPrice : result.order.stopPrice}
                </span>
                <span className="block text-2xs tracking-wider text-ink-secondary mt-1.5">
                  SCHEDULER WILL SWEEP THIS · {result.order.id}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---------- Rejection slip ---------- */}
      {error && (
        <div className="mt-3 paper rounded-ticket border-l-0 shadow-paper px-4 py-3 border border-sell-text/40 animate-slide-in-right" role="alert">
          <div className="flex items-start gap-2.5">
            <span className="stamp stamp-sell !text-[0.6em] !border-2 mt-px">REJECTED</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink leading-snug">{error}</p>
              <p className="text-2xs text-ink-secondary mt-1">Nothing was written to the ledger. Adjust the ticket and re-file.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
