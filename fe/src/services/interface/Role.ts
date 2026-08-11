// services/interface/Role.ts - Fixed Version
export interface Role {
  id: number;
  name: string;
  guard_name: string;
  team_id: number;
  host_id: number;
  created_at?: string;
  updated_at?: string;
  permissions?: string[];
}

export interface RoleDataTable {
  id: number;
  DT_RowIndex: number;
  name: string;
  created_at: string;
  action: string;
}

export interface RoleResponse {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: RoleDataTable[];
}

export interface RoleDetailResponse {
  success: boolean;
  data: Role;
}

export interface CreateRoleResponse {
  success: boolean;
  message: string;
  data: Role;
}

export interface UpdateRoleResponse {
  success: boolean;
  data: Role;
}

export interface DeleteRoleResponse {
  success: boolean;
  message: string;
}

export interface CreateRolePayload {
  name: string;
}

export interface UpdateRolePayload {
  name: string;
}

export interface GetRolesParams {
  search?: string;
  draw?: number;
  start?: number;
  length?: number;
}

export interface ApiErrorResponse {
  error: boolean;
  message: string;
  code: number;
  errors?: {
    [key: string]: string[];
  };
  timestamp: string;
}

// Fixed Permission interface
export interface Permission {
  name: string;
  category: string;
  description: string;
}

export interface RoleWithPermissions {
  id: number;
  name: string;
  guard_name: string;
  team_id: number;
  host_id: number;
  permissions: string[];
}

export interface AssignPermissionsPayload {
  permissions: string[];
}

export interface AssignPermissionsResponse {
  success: boolean;
  message: string;
  data: RoleWithPermissions;
}