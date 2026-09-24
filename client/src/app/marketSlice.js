import { createSlice } from '@reduxjs/toolkit'
import { getAllQuotes } from '../engine/market.js'

const marketSlice = createSlice({
  name: 'market',
  initialState: {
    quotes: {}, // symbol -> quote
    lastTickAt: 0,
    feedStatus: 'live'
  },
  reducers: {
    tick(state, action) {
      for (const q of Object.values(action.payload)) {
        state.quotes[q.symbol] = q
      }
      state.lastTickAt = Date.now()
    },
    hydrate(state) {
      for (const q of getAllQuotes()) state.quotes[q.symbol] = q
      state.lastTickAt = Date.now()
    },
    feedStatus(state, action) {
      state.feedStatus = action.payload
    }
  }
})

export const { tick, hydrate, feedStatus } = marketSlice.actions
export default marketSlice.reducer
