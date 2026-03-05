import apiClient from './axiosClient';

/**
 * Lấy danh sách khách hàng
 */
export const getCustomersListAPI = async (search = '', phone = '') => {
    const params = {};
    if (search) params.search = search;
    if (phone) params.phone = phone;

    const response = await apiClient.get('/customers', { params });
    return response.data;
};

/**
 * Lấy chi tiết khách hàng
 */
export const getCustomerByIdAPI = async (id) => {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data;
};

/**
 * Tạo khách hàng mới
 */
export const createCustomerAPI = async (customerData) => {
    const response = await apiClient.post('/customers', customerData);
    return response.data;
};

/**
 * Cập nhật thông tin khách hàng
 */
export const updateCustomerAPI = async (customerId, customerData) => {
    const response = await apiClient.put(`/customers/${customerId}`, customerData);
    return response.data;
};

/**
 * Xóa khách hàng
 */
export const deleteCustomerAPI = async (customerId) => {
    const response = await apiClient.delete(`/customers/${customerId}`);
    return response.data;
};

/**
 * Tìm kiếm khách hàng theo tên hoặc số điện thoại
 */
export const searchCustomersAPI = async (query) => {
    return getCustomersListAPI(query, query);
};
