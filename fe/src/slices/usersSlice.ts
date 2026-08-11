// slices/usersSlice.ts - Fixed version with proper types
import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { 
  AdminUser, 
  AdminUserListResponse,
  CreateAdminUserPayload,
  UpdateAdminUserPayload
} from "@/services/interface/AdminUser";
import { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser 
} from "@/services/service";

interface UsersState {
  usersList: AdminUserListResponse | null;
  currentUser: AdminUser | null;
  loading: boolean;
  error: string | null;
  operationLoading: boolean;
  operationError: string | null;
}

const initialState: UsersState = {
  usersList: null,
  currentUser: null,
  loading: false,
  error: null,
  operationLoading: false,
  operationError: null
};

// Async thunks with proper error handling and retry logic
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (params: { search?: string; start?: number; length?: number } = {}, { rejectWithValue }) => {
    const maxRetries = 3;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying fetchUsers (attempt ${attempt + 1}) after ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const response = await getUsers(params);
        return response;
      } catch (error) {
        console.error(`fetchUsers error (attempt ${attempt + 1}):`, error);
        
        if (attempt === maxRetries) {
          // All retries failed
          const message = error instanceof Error ? error.message : 'Failed to fetch users';
          return rejectWithValue(message);
        }
        // Continue to next retry attempt
      }
    }
    
    // This should never be reached, but TypeScript needs it
    return rejectWithValue('Failed to fetch users after retries');
  }
);

export const fetchUserById = createAsyncThunk(
  'users/fetchUserById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await getUserById(id);
      return response;
    } catch (error) {
      console.error('fetchUserById error:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch user';
      return rejectWithValue(message);
    }
  }
);

export const createNewUser = createAsyncThunk(
  'users/createUser',
  async (payload: CreateAdminUserPayload, { rejectWithValue }) => {
    try {
      console.log('Redux thunk - creating user with payload:', payload);
      const response = await createUser(payload);
      return response;
    } catch (error) {
      console.error('createNewUser error:', error);
      const message = error instanceof Error ? error.message : 'Failed to create user';
      return rejectWithValue(message);
    }
  }
);

export const updateExistingUser = createAsyncThunk(
  'users/updateUser',
  async ({ id, payload }: { id: number; payload: UpdateAdminUserPayload }, { rejectWithValue }) => {
    try {
      console.log('Redux thunk - updating user:', id, 'with payload:', payload);
      const response = await updateUser(id, payload);
      return { id, data: response };
    } catch (error) {
      console.error('updateExistingUser error:', error);
      const message = error instanceof Error ? error.message : 'Failed to update user';
      return rejectWithValue(message);
    }
  }
);

export const deleteExistingUser = createAsyncThunk(
  'users/deleteUser',
  async ({ id, action }: { id: number; action: 'delete' | 'deactivate' }, { rejectWithValue }) => {
    try {
      await deleteUser(id, action);
      return { id, action };
    } catch (error) {
      console.error('deleteExistingUser error:', error);
      const message = error instanceof Error ? error.message : 'Failed to perform action on user';
      return rejectWithValue(message);
    }
  }
);

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setUsersList(state, action: PayloadAction<AdminUserListResponse>) {
      state.usersList = action.payload;
    },
    setCurrentUser(state, action: PayloadAction<AdminUser>) {
      state.currentUser = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
      state.operationError = null;
    },
    resetUsersState(state) {
      state.usersList = null;
      state.currentUser = null;
      state.loading = false;
      state.error = null;
      state.operationLoading = false;
      state.operationError = null;
    },
    clearOperationState(state) {
      state.operationLoading = false;
      state.operationError = null;
    }
  },
  extraReducers: (builder) => {
    // Fetch users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.usersList = action.payload;
        state.error = null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch user by ID
    builder
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
        state.error = null;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create user
    builder
      .addCase(createNewUser.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(createNewUser.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationError = null;
        
        // Add the new user to the list if it exists
        if (state.usersList && state.usersList.data && action.payload.data) {
          state.usersList.data.push(action.payload.data);
          state.usersList.recordsTotal += 1;
          state.usersList.recordsFiltered += 1;
        }
      })
      .addCase(createNewUser.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
        console.error('Create user rejected:', action.payload);
      });

    // Update user
    builder
      .addCase(updateExistingUser.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(updateExistingUser.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationError = null;
        
        const { id, data } = action.payload;
        
        // Update current user if it's the one being edited
        if (state.currentUser && state.currentUser.id === id) {
          state.currentUser = { ...state.currentUser, ...data.data };
        }
        
        // Update user in the list if it exists
        if (state.usersList && state.usersList.data) {
          const index = state.usersList.data.findIndex(user => user.id === id);
          if (index !== -1) {
            state.usersList.data[index] = { ...state.usersList.data[index], ...data.data };
          }
        }
      })
      .addCase(updateExistingUser.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
        console.error('Update user rejected:', action.payload);
      });

    // Delete/Deactivate user
    builder
      .addCase(deleteExistingUser.pending, (state) => {
        state.operationLoading = true;
        state.operationError = null;
      })
      .addCase(deleteExistingUser.fulfilled, (state, action) => {
        state.operationLoading = false;
        state.operationError = null;
        
        const { id, action: actionType } = action.payload;
        
        if (actionType === 'delete') {
          // Remove user from list if it exists
          if (state.usersList && state.usersList.data) {
            state.usersList.data = state.usersList.data.filter(user => user.id !== id);
            state.usersList.recordsTotal -= 1;
            state.usersList.recordsFiltered -= 1;
          }
          
          // Clear current user if it's the one being deleted
          if (state.currentUser && state.currentUser.id === id) {
            state.currentUser = null;
          }
        } else if (actionType === 'deactivate') {
          // For deactivation, update the user status in the list
          if (state.usersList && state.usersList.data) {
            const userIndex = state.usersList.data.findIndex(user => user.id === id);
            if (userIndex !== -1) {
              // Update the user status to 'Inactive'
              state.usersList.data[userIndex] = {
                ...state.usersList.data[userIndex],
                is_active: 'Inactive'
              };
            }
          }
          
          // Clear current user if it's the one being deactivated
          if (state.currentUser && state.currentUser.id === id) {
            state.currentUser = null;
          }
        }
      })
      .addCase(deleteExistingUser.rejected, (state, action) => {
        state.operationLoading = false;
        state.operationError = action.payload as string;
        console.error('Delete user rejected:', action.payload);
      });
  }
});

export const { 
  setUsersList, 
  setCurrentUser, 
  setLoading, 
  setError,
  clearError,
  resetUsersState,
  clearOperationState
} = usersSlice.actions;

export default usersSlice.reducer;