import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as api from '../services/api.js'

const stored = JSON.parse(localStorage.getItem('tradex.session') || 'null')

export const auth = createAsyncThunk('session/auth', async ({ mode, creds }) => {
  const res = mode === 'register' ? await api.register(creds) : await api.login(creds)
  localStorage.setItem('tradex.session', JSON.stringify({ user: res.user, token: res.accessToken }))
  return res
})

export const refreshUser = createAsyncThunk('session/refreshUser', async () => {
  const user = await api.fetchMe()
  const current = JSON.parse(localStorage.getItem('tradex.session') || '{}'); localStorage.setItem('tradex.session', JSON.stringify({ ...current, user }))
  return user
})

const sessionSlice = createSlice({
  name: 'session',
  initialState: {
    user: stored?.user || null,
    status: 'idle',
    error: null,
    skippedVerification: true
  },
  reducers: {
    setSkipVerification(state, action) {
      state.skippedVerification = action.payload
    },
    logout(state) {
      state.user = null
      state.status = 'idle'
      state.error = null
      state.skippedVerification = true
      localStorage.removeItem('tradex.session')
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(auth.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(auth.fulfilled, (state, action) => {
        state.status = 'idle'
        state.user = action.payload.user
      })
      .addCase(auth.rejected, (state, action) => {
        state.status = 'error'
        state.error = action.error.message
      })
      .addCase(refreshUser.fulfilled, (state, action) => {
        state.user = action.payload
      })
  }
})

export const { logout, setSkipVerification } = sessionSlice.actions
export default sessionSlice.reducer
