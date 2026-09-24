import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import Mark from '../components/Mark.jsx'
import { auth } from '../app/sessionSlice.js'
import Icon from '../components/Icon.jsx'
import { money } from '../lib/format.js'
import { START_CASH } from '../data/universe.js'

export default function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState()
  const [showPassword, setShowPassword] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await dispatch(auth({ mode, creds: form })).unwrap()
      navigate('/')
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl grid md:grid-cols-[1.1fr_1fr] gap-0 rounded-ticket overflow-hidden shadow-paper-lift">
        {/* ---------- The desk side ---------- */}
        <div className="hidden md:flex flex-col bg-desk-950 p-8 border border-desk-line border-r-0 rounded-l-ticket">
          <div className="flex items-center gap-3">
            <Mark size={36} />
            <div>
              <div className="font-bold text-paper-50 tracking-tight text-lg leading-none">TradeX</div>
              <div className="font-mono text-2xs text-paper-100/60 tracking-widest mt-1">VIRTUAL TRADING DESK</div>
            </div>
          </div>

          <div className="mt-10 space-y-5">
            <h1 className="text-2xl font-bold text-paper-100 tracking-tight leading-snug">
              Trade the tape.<br />
              Keep the ledger.
            </h1>
            <p className="text-sm text-paper-100/60 leading-relaxed max-w-[38ch]">
              A virtual stock trading desk with an append-only transaction ledger, live simulated
              quotes, limit and stop orders resolved by a scheduler, and every rupee reconciled
              against the fills that moved it.
            </p>
            <ul className="space-y-2.5 text-sm text-paper-100/70">
              {[
                'Open with ' + money(START_CASH.IN, 'IN', { compact: true }) + ' in virtual funds',
                'Market, limit and stop orders on NSE and US feeds',
                'Every figure traceable to the ledger entry that created it'
              ].map((t) => (
                <li key={t} className="flex gap-2.5 items-baseline">
                  <span className="w-1.5 h-1.5 rounded-full bg-warn-mark shrink-0 translate-y-[-1px]" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-auto pt-10 font-mono text-2xs text-paper-100/55 tracking-wider">
            VIRTUAL FUNDS ONLY — NO REAL MONEY, NO BROKERAGE
          </p>
        </div>

        {/* ---------- The ticket side ---------- */}
        <div className="paper paper-ticket p-8 sm:p-10 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold tracking-[0.12em] uppercase text-ink">
              {mode === 'login' ? 'Sign in to your desk' : 'Open a new desk'}
            </h2>
          </div>

          <form onSubmit={submit} className="space-y-4" noValidate>
            {mode === 'register' && (
              <label className="block">
                <span className="text-xs text-ink-secondary">Full name</span>
                <input className="field mt-1" value={form.name} onChange={set('name')} autoComplete="name" placeholder="Aditi Sharma" />
              </label>
            )}
            <label className="block">
              <span className="text-xs text-ink-secondary">Email</span>
              <input className="field mt-1" type="email" value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@example.com" />
            </label>
            <label className="block relative">
              <span className="text-xs text-ink-secondary">Password</span>
              <div className="relative mt-1">
                <input className="field w-full pr-10" type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="At least 6 characters" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-ink hover:text-ink-secondary transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
            </label>

            {error && (
              <p className="text-xs text-sell-text font-medium" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-ticket bg-ink text-paper-50 py-2.5 text-sm font-bold tracking-wider uppercase shadow-paper hover:shadow-paper-lift active:translate-y-px transition-all disabled:opacity-60"
            >
              {busy ? 'FILING…' : mode === 'login' ? 'Sign in' : 'Open desk'}
            </button>
          </form>

          <p className="mt-6 text-xs text-ink-secondary">
            {mode === 'login' ? (
              <>
                New here?{' '}
                <button onClick={() => { setMode('register'); setError('') }} className="text-accent-text font-semibold hover:underline underline-offset-2">
                  Open a new desk
                </button>
              </>
            ) : (
              <>
                Already have a desk?{' '}
                <button onClick={() => { setMode('login'); setError('') }} className="text-accent-text font-semibold hover:underline underline-offset-2">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
