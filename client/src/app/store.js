import { configureStore, createListenerMiddleware } from '@reduxjs/toolkit'
import sessionReducer from './sessionSlice.js'
import marketReducer from './marketSlice.js'
import bookReducer, { refreshBook, loadBook, placeOrder, cancelOrder, sweep } from './bookSlice.js'

// After any ledger mutation, reload the book so the UI always mirrors the ledger.
const sync = createListenerMiddleware()
sync.startListening({
  actionCreator: placeOrder.fulfilled,
  effect: (action, api) => {
    if (!action.payload?.duplicate) api.dispatch(refreshBook())
  }
})
sync.startListening({
  actionCreator: cancelOrder.fulfilled,
  effect: (action, api) => api.dispatch(refreshBook())
})
sync.startListening({
  actionCreator: sweep.fulfilled,
  effect: (action, api) => {
    if ((action.payload?.fills || []).length) api.dispatch(refreshBook())
  }
})
sync.startListening({
  actionCreator: loadBook.fulfilled,
  effect: (action, api) => {
    const region = action.meta.arg
    if (api.getState().book.region !== region) {
      api.dispatch({ type: 'book/setRegion', payload: region })
    }
  }
})

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    market: marketReducer,
    book: bookReducer
  },
  middleware: (gdm) => gdm({ serializableCheck: false }).prepend(sync.middleware)
})
