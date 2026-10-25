import { configureStore } from '@reduxjs/toolkit'
import { setSessionEndedHandler } from '../lib/apiClient'
import auth, { sessionEnded } from './authSlice'

export const store = configureStore({
  reducer: {
    auth,
    // cart, catalog, ... are added module-by-module
  },
})

// Only a tab that believed it was signed in gets the "session ended" treatment; an
// anonymous visitor's failed /me check on page load is not news.
setSessionEndedHandler(() => {
  if (store.getState().auth.status === 'authenticated') store.dispatch(sessionEnded())
})
