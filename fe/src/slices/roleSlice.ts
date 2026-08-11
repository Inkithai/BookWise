// slices/roleSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Role, RoleDataTable } from '@/services/interface/Role';
import { roleService } from '@/services/service';
import { GetRolesParams } from '@/services/interface/Role';

interface RoleState {
  roles: RoleDataTable[];
  currentRole: Role | null;
  loading: boolean;
  error: string | null;
  pagination: {
    draw: number;
    recordsTotal: number;
    recordsFiltered: number;
  };
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

const initialState: RoleState = {
  roles: [],
  currentRole: null,
  loading: false,
  error: null,
  pagination: {
    draw: 0,
    recordsTotal: 0,
    recordsFiltered: 0
  }
};

// Async thunks
export const fetchRoles = createAsyncThunk(
  'roles/fetchRoles',
  async (params: GetRolesParams, { rejectWithValue }) => {
    try {
      const response = await roleService.getRoles(params);
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(
        apiError.response?.data?.message || 'Failed to fetch roles'
      );
    }
  }
);

export const fetchRoleById = createAsyncThunk(
  'roles/fetchRoleById',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await roleService.getRoleById(id);
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(
        apiError.response?.data?.message || 'Failed to fetch role'
      );
    }
  }
);

export const createNewRole = createAsyncThunk(
  'roles/createNewRole',
  async (payload: { name: string }, { rejectWithValue }) => {
    try {
      const response = await roleService.createRole(payload);
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(
        apiError.response?.data?.message || 'Failed to create role'
      );
    }
  }
);

export const updateExistingRole = createAsyncThunk(
  'roles/updateExistingRole',
  async (
    { id, payload }: { id: number; payload: { name: string } },
    { rejectWithValue }
  ) => {
    try {
      const response = await roleService.updateRole(id, payload);
      return response.data;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(
        apiError.response?.data?.message || 'Failed to update role'
      );
    }
  }
);

export const deleteExistingRole = createAsyncThunk(
  'roles/deleteExistingRole',
  async (id: number, { rejectWithValue }) => {
    try {
      const response = await roleService.deleteRole(id);
      return { id, message: response.data.message };
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(
        apiError.response?.data?.message || 'Failed to delete role'
      );
    }
  }
);

const roleSlice = createSlice({
  name: 'roles',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentRole: (state) => {
      state.currentRole = null;
    },
    resetRoleState: (state) => {
      state.roles = [];
      state.currentRole = null;
      state.loading = false;
      state.error = null;
      state.pagination = {
        draw: 0,
        recordsTotal: 0,
        recordsFiltered: 0
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch roles
      .addCase(fetchRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.roles = action.payload.data;
        state.pagination = {
          draw: action.payload.draw,
          recordsTotal: action.payload.recordsTotal,
          recordsFiltered: action.payload.recordsFiltered
        };
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch role by ID
      .addCase(fetchRoleById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoleById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRole = action.payload.data;
      })
      .addCase(fetchRoleById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create role
      .addCase(createNewRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewRole.fulfilled, (state, action) => {
        state.loading = false;
        // Convert the created role to DataTable format and add to list
        const newRole: RoleDataTable = {
          id: action.payload.data.id, // Include the id
          DT_RowIndex: state.roles.length + 1,
          name: action.payload.data.name,
          created_at: action.payload.data.created_at || new Date().toISOString(),
          action: `<a title="Edit" href="/admin/roles/${action.payload.data.id}/show" class="data-table-btn"><i class="fa fa-pencil-alt"></i></a><a title="Permissions" href="/admin/roles/permissions/${action.payload.data.id}" class="data-table-btn"><i class="fa fa-lock"></i></a><a title="Delete" data-id="${action.payload.data.id}" class="data-table-btn delete_data"><i class="fa fa-trash"></i></a>`
        };
        state.roles.unshift(newRole);
        state.pagination.recordsTotal += 1;
        state.pagination.recordsFiltered += 1;
      })
      .addCase(createNewRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update role
      .addCase(updateExistingRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateExistingRole.fulfilled, (state, action) => {
        state.loading = false;
        // Update the role in the list
        const index = state.roles.findIndex(
          (role) => role.id === action.payload.data.id
        );
        if (index !== -1) {
          state.roles[index] = {
            ...state.roles[index],
            name: action.payload.data.name,
            action: state.roles[index].action.replace(
              /data-id="\d+"/,
              `data-id="${action.payload.data.id}"`
            )
          };
        }
        // Update current role if it's the one being edited
        if (state.currentRole && state.currentRole.id === action.payload.data.id) {
          state.currentRole = action.payload.data;
        }
      })
      .addCase(updateExistingRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete role
      .addCase(deleteExistingRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteExistingRole.fulfilled, (state, action) => {
        state.loading = false;
        // Remove the role from the list
        state.roles = state.roles.filter(
          (role) => role.id !== action.payload.id
        );
        state.pagination.recordsTotal -= 1;
        state.pagination.recordsFiltered -= 1;
        // Clear current role if it's the one being deleted
        if (state.currentRole && state.currentRole.id === action.payload.id) {
          state.currentRole = null;
        }
      })
      .addCase(deleteExistingRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export const { clearError, clearCurrentRole, resetRoleState } = roleSlice.actions;
export default roleSlice.reducer;