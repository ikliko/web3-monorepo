import { createSlice } from '@reduxjs/toolkit'

export const walletStore = createSlice({
  name: 'wallet',
  initialState: {
    value: 0,
  },
  reducers: {
    addAddress: (state, action) => {

    },
    getCurrentAddress: (state) => {

    },
  },
});

// Action creators are generated for each case reducer function
export const { addAddress, getCurrentAddress } = walletStore.actions;

export default walletStore.reducer


