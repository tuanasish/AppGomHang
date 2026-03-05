/**
 * Formats a number as VND currency
 * @param {number} amount
 * @returns {string} formatted currency string
 */
export const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0 ₫';
    return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
};

/**
 * Formats a date string or Date object to DD/MM/YYYY
 * @param {string|Date} dateString
 * @returns {string} formatted date string
 */
export const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Invalid date
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } catch (error) {
        return dateString;
    }
};
