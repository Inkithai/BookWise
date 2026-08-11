import { http, handleApiError } from './service';

// --- Interfaces ---

export interface Feature {
    id: number;
    name: string;
    description?: string;
    feature_group_id?: number;
    is_active?: boolean | number;
    code?: string;
    price?: number;
    created_at?: string;
    updated_at?: string;
}

export interface FeatureGroup {
    id?: number;
    name: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
    features?: Feature[];
}

export interface PaginatedResponse<T> {
    current_page: number;
    data: T;
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: any[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

// --- Features API ---

export const getFeatures = async (params?: any): Promise<PaginatedResponse<Feature[]> | Feature[]> => {
    try {
        const response = await http.get('v1/features', { params });
        // Handle both paginated and non-paginated responses based on structural checks
        if (response.data && response.data.data && typeof response.data.current_page !== 'undefined') {
            return response.data;
        }
        return response.data?.data || response.data;
    } catch (error) {
        throw handleApiError(error, 'fetch features');
    }
};

export const getFeatureById = async (id: number): Promise<Feature> => {
    try {
        const response = await http.get(`v1/features/${id}`);
        return response.data?.data || response.data;
    } catch (error) {
        throw handleApiError(error, `fetch feature ${id}`);
    }
};

export const createFeature = async (data: Partial<Feature>): Promise<Feature> => {
    try {
        const response = await http.post('v1/features', data);
        return response.data?.data || response.data;
    } catch (error) {
        throw handleApiError(error, 'create feature');
    }
};

export const updateFeature = async (id: number, data: Partial<Feature>): Promise<Feature> => {
    try {
        // Some Laravel APIs expect POST with _method=PUT or POST directly for updates.
        // Assuming backend POST /api/v1/features/{id} is updating an existing feature as per user request log
        const response = await http.post(`v1/features/${id}`, data);
        return response.data?.data || response.data;
    } catch (error) {
        throw handleApiError(error, `update feature ${id}`);
    }
};

export const deleteFeature = async (id: number): Promise<void> => {
    try {
        await http.delete(`v1/features/${id}`);
    } catch (error) {
        throw handleApiError(error, `delete feature ${id}`);
    }
};

// --- Feature Groups API ---

export const getFeatureGroups = async (params?: any): Promise<FeatureGroup[]> => {
    try {
        const response = await http.get('v1/feature-groups', { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw handleApiError(error, 'fetch feature groups');
    }
};

export const getFeatureGroupById = async (id: number): Promise<FeatureGroup> => {
    try {
        const response = await http.get(`v1/feature-groups/${id}`);
        return response.data?.data || response.data;
    } catch (error) {
        throw handleApiError(error, `fetch feature group ${id}`);
    }
};

export const createFeatureGroup = async (data: Partial<FeatureGroup>): Promise<FeatureGroup> => {
    try {
        const response = await http.post('v1/feature-groups', data);
        return response.data?.data || response.data;
    } catch (error) {
        throw handleApiError(error, 'create feature group');
    }
};

export const updateFeatureGroup = async (id: number, data: Partial<FeatureGroup>): Promise<FeatureGroup> => {
    try {
        const response = await http.put(`v1/feature-groups/${id}`, data);
        return response.data?.data || response.data;
    } catch (error) {
        throw handleApiError(error, `update feature group ${id}`);
    }
};

export const deleteFeatureGroup = async (id: number): Promise<void> => {
    try {
        await http.delete(`v1/feature-groups/${id}`);
    } catch (error) {
        throw handleApiError(error, `delete feature group ${id}`);
    }
};

// --- Team Features API ---

export const getTeamFeatures = async (params?: any): Promise<Feature[]> => {
    try {
        const response = await http.get('v1/team-features', { params });
        return response.data?.data || response.data;
    } catch (error) {
        throw handleApiError(error, 'fetch team features');
    }
};
