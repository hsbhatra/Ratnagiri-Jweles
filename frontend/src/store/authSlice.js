import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { authApi } from '../api/auth'

// Session state lives server-side (httpOnly cookies); the client only mirrors "who am I".
export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
  try {
    return (await authApi.me()).user
  } catch {
    return null
  }
})

export const logout = createAsyncThunk('auth/logout', async ({ everywhere = false } = {}) => {
  try {
    await (everywhere ? authApi.logoutAll() : authApi.logout())
  } catch {
    // Already signed out server-side — clearing local state is still right
  }
})

const authSlice = createSlice({
  name: 'auth',
  // justRegistered lets the account page greet a brand-new customer
  // sessionEnded: the session was ended elsewhere while this tab was signed in
  initialState: { user: null, status: 'unknown', justRegistered: false, sessionEnded: false }, // status: unknown → authenticated | anonymous
  reducers: {
    signedIn(state, action) {
      state.user = action.payload
      state.status = 'authenticated'
      state.sessionEnded = false
    },
    sessionEnded(state) {
      state.user = null
      state.status = 'anonymous'
      state.justRegistered = false
      state.sessionEnded = true
    },
    registered(state, action) {
      state.user = action.payload
      state.status = 'authenticated'
      state.justRegistered = true
    },
    welcomeShown(state) {
      state.justRegistered = false
    },
    userUpdated(state, action) {
      state.user = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload
        state.status = action.payload ? 'authenticated' : 'anonymous'
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.status = 'anonymous'
        state.justRegistered = false
        state.sessionEnded = false
      })
  },
})

export const { signedIn, sessionEnded, registered, welcomeShown, userUpdated } = authSlice.actions
export const selectAuth = (state) => state.auth
export default authSlice.reducer
