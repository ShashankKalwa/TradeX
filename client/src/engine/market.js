import { STOCKS } from '../data/universe.js'
import { mulberry32, hashString, gauss } from './random.js'
import { io } from 'socket.io-client'

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const state = new Map() // symbol -> quote
const listeners = new Set()
let socket = null;

function seedQuote(s) {
  const rand = mulberry32(hashString(s.symbol + ':day'))
  const prevClose = s.base * (1 + gauss(rand) * 0.008)
  const price = prevClose * (1 + gauss(rand) * 0.006)
  return {
    symbol: s.symbol,
    price: round(price),
    prevClose: round(prevClose),
    dayOpen: round(prevClose * (1 + gauss(rand) * 0.003)),
    dayHigh: round(Math.max(price, prevClose) * (1 + rand() * 0.004)),
    dayLow: round(Math.min(price, prevClose) * (1 - rand() * 0.004)),
    volume: Math.round(2e6 * (0.3 + rand() * 2)),
    tickDir: 0,
    lastTickAt: Date.now()
  }
}

function round(p) {
  return Math.round(p * 100) / 100
}

export function initMarket() {
  if (state.size) return
  for (const s of STOCKS) state.set(s.symbol, seedQuote(s))
}

export function getQuote(symbol) {
  initMarket()
  return state.get(symbol)
}

export function getAllQuotes() {
  initMarket()
  return [...state.values()]
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function tick() {
  if (!USE_MOCK) return; // Real ticks come via socket
  initMarket()
  const updates = {}
  for (const q of state.values()) {
    const drift = (q.prevClose - q.price) * 0.002 // gentle mean reversion
    const shock = gauss(Math.random) * 0.0014
    const next = round(Math.max(q.price * (1 + shock) + drift, 0.05))
    if (next === q.price) continue
    const tickDir = next > q.price ? 1 : -1
    const u = {
      ...q,
      price: next,
      dayHigh: Math.max(q.dayHigh, next),
      dayLow: Math.min(q.dayLow, next),
      volume: q.volume + Math.round(Math.random() * 8000),
      tickDir,
      lastTickAt: Date.now()
    }
    state.set(q.symbol, u)
    updates[q.symbol] = u
  }
  if (Object.keys(updates).length) {
    for (const fn of listeners) fn(updates)
  }
}

let timer = null
export function startFeed(intervalMs = 2000) {
  if (!USE_MOCK) {
    if (socket) return;
    const session = JSON.parse(localStorage.getItem('tradex.session')); socket = io(API_URL, { auth: { token: session?.token } });
    socket.on('priceUpdate', (updates) => {
      // updates is { SYMBOL: { price, tickDir, ... } }
      for (const [sym, u] of Object.entries(updates)) {
        const current = state.get(sym) || {};
        state.set(sym, { ...current, ...u });
      }
      for (const fn of listeners) fn(updates);
    });
    return;
  }

  if (timer) return
  timer = setInterval(tick, intervalMs)
}

export function stopFeed() {
  if (!USE_MOCK) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return;
  }
  clearInterval(timer)
  timer = null
}

export function marketStatus(region) {
  const now = new Date()
  const ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000)
  const day = ist.getDay()
  const mins = ist.getHours() * 60 + ist.getMinutes()
  if (region === 'IN') {
    if (day === 0 || day === 6) return 'CLOSED'
    if (mins < 555) return 'PRE_OPEN'
    if (mins > 930) return 'CLOSED'
    return 'OPEN'
  }
  const et = new Date(now.getTime() + (-240 - 0 + now.getTimezoneOffset()) * 60000)
  const d = et.getDay()
  const m = et.getHours() * 60 + et.getMinutes()
  if (d === 0 || d === 6) return 'CLOSED'
  if (m < 570 || m > 960) return 'CLOSED'
  return 'OPEN'
}
