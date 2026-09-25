import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { tick, hydrate } from './app/marketSlice.js'
import { sweep, refreshBook, clearSweepFills } from './app/bookSlice.js'
import { refreshUser } from './app/sessionSlice.js'
import { startFeed, subscribe, stopFeed } from './engine/market.js'

import AppShell from './components/AppShell.jsx'
import Login from './pages/Login.jsx'
import VerifyEmail from './pages/VerifyEmail.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Markets from './pages/Markets.jsx'
import StockDetail from './pages/StockDetail.jsx'
import Portfolio from './pages/Portfolio.jsx'
import Orders from './pages/Orders.jsx'
import Ledger from './pages/Ledger.jsx'
import Watchlist from './pages/Watchlist.jsx'
import Leaderboard from './pages/Leaderboard.jsx'

export default function App() {
  const dispatch = useDispatch()
  const session = useSelector((s) => s.session)
  const region = useSelector((s) => s.book.region)
  const sweepFills = useSelector((s) => s.book.sweepFills)
  const location = useLocation()

  // Always refresh the user from the backend on page load to ensure 
  // verification status (and other details) aren't stale in localStorage.
  // We also listen for window focus, so if they switch tabs to check their email
  // and come back, it instantly updates the UI without requiring a manual refresh.
  useEffect(() => {
    if (!session.user) return

    const handleFocus = () => dispatch(refreshUser())
    
    // Fire once on mount
    handleFocus()
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [session.user, dispatch])

  // Boot the feed: subscribe the store to price ticks, then start the clock.
  useEffect(() => {
    dispatch(hydrate())
    const unsub = subscribe((updates) => dispatch(tick(updates)))
    startFeed(2000)
    return () => {
      unsub()
      stopFeed()
    }
  }, [dispatch])

  // Load the book for the active region
  useEffect(() => {
    if (session.user) dispatch(refreshBook())
  }, [session.user, region, dispatch])

  // The scheduler sweep — the client stand-in for node-cron on the backend.
  useEffect(() => {
    if (!session.user) return
    const iv = setInterval(() => dispatch(sweep(region)), 8000)
    return () => clearInterval(iv)
  }, [session.user, region, dispatch])

  // Confirmation slips for scheduler fills
  useEffect(() => {
    if (sweepFills.length) {
      for (const o of sweepFills) {
        toast.success(`Order filled by scheduler: ${o.type} ${o.side} — ${o.qty} ${o.symbol} @ ${o.filledPrice?.toFixed(2)}`)
      }
      dispatch(clearSweepFills())
    }
  }, [sweepFills, dispatch])

  // Scroll to top on navigation
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  if (!session.user) {
    return (
      <>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <ToastContainer position="bottom-right" theme="dark" />
      </>
    )
  }

  return (
    <>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/stock/:symbol" element={<StockDetail />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/transactions" element={<Ledger />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
      <ToastContainer position="bottom-right" theme="dark" />
    </>
  )
}
