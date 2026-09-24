import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as api from '../services/api.js'

const storedRegion = localStorage.getItem('tradex.region') || 'IN'

export const loadBook = createAsyncThunk('book/load', async (region) => api.fetchBook(region))
export const placeOrder = createAsyncThunk('book/placeOrder', async (payload) => api.placeOrder(payload))
export const cancelOrder = createAsyncThunk('book/cancelOrder', async ({ region, orderId }) =>
  api.cancelOrder(region, orderId)
)
export const toggleWatch = createAsyncThunk('book/toggleWatch', async ({ region, symbol }) =>
  api.toggleWatch(region, symbol)
)
export const sweep = createAsyncThunk('book/sweep', async (region) => api.sweepOrders(region))

const bookSlice = createSlice({
  name: 'book',
  initialState: {
    region: storedRegion,
    status: 'idle', // idle | loading | ready | error
    transactions: [],
    orders: [],
    watchlist: [],
    cash: 0,
    orderStatus: 'idle', // idle | submitting | done | error
    orderError: null,
    lastResult: null, // { status, order, fill } — drives the stamp animation
    sweepFills: []
  },
  reducers: {
    setRegion(state, action) {
      state.region = action.payload
      localStorage.setItem('tradex.region', action.payload)
      state.status = 'idle'
    },
    clearOrderResult(state) {
      state.orderStatus = 'idle'
      state.orderError = null
      state.lastResult = null
    },
    clearSweepFills(state) {
      state.sweepFills = []
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadBook.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(loadBook.fulfilled, (state, action) => {
        const b = action.payload
        state.transactions = b.transactions
        state.orders = b.orders
        state.watchlist = b.watchlist
        state.cash = b.cash
        state.status = 'ready'
      })
      .addCase(loadBook.rejected, (state) => {
        state.status = 'error'
      })
      .addCase(placeOrder.pending, (state) => {
        state.orderStatus = 'submitting'
        state.orderError = null
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.orderStatus = 'done'
        state.lastResult = action.payload
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.orderStatus = 'error'
        state.orderError = action.error.message
      })
      .addCase(toggleWatch.fulfilled, (state, action) => {
        state.watchlist = action.payload.watchlist
      })
      .addCase(sweep.fulfilled, (state, action) => {
        state.sweepFills = action.payload.fills || []
      })
  }
})

export const { setRegion, clearOrderResult, clearSweepFills } = bookSlice.actions

export const refreshBook = () => (dispatch, getState) => {
  const { region } = getState().book
  return dispatch(loadBook(region))
}

export default bookSlice.reducer
