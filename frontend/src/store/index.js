import { configureStore } from '@reduxjs/toolkit'
import auth from './authSlice'

export const store = configureStore({
  reducer: {
    auth,
    // cart, catalog, ... are added module-by-module
  },
})
