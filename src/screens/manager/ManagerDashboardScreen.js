import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../theme/theme';
import Loading from '../../components/common/Loading';
import { useShiftsList } from '../../hooks/queries/useShifts';
import { useOrdersByDate } from '../../hooks/queries/useOrders';

export default function ManagerDashboardScreen() {
    const { userInfo } = useAuth();

    const [selectedStaffId, setSelectedStaffId] = useState(null);

    const today = new Date().toISOString().split('T')[0];

    const { data: shiftsRes, isLoading: shiftsLoading, refetch: refetchShifts } = useShiftsList({ date: today });
    const { data: ordersRes, isLoading: ordersLoading, refetch: refetchOrders } = useOrdersByDate(today);

    const loading = shiftsLoading || ordersLoading;

    // Tính thống kê
    const stats = useMemo(() => {
        const shifts = shiftsRes?.success ? shiftsRes.data : [];
        const orders = ordersRes?.success ? ordersRes.data : [];

        const totalTienGiaoCaTheoNgay = shifts.reduce((sum, shift) => sum + (Number(shift.tienGiaoCa) || 0), 0);
        const totalTienHangDaTraTheoNgay = orders.reduce((sum, order) => sum + (Number(order.tienHang) || 0), 0);
        const totalTienHoaHongTheoNgay = orders.reduce((sum, order) => sum + (Number(order.tienHoaHong) || 0), 0);

        return {
            totalTienGiaoCaTheoNgay,
            totalTienHangDaTraTheoNgay,
            totalTienHoaHongTheoNgay,
        };
    }, [shiftsRes, ordersRes]);

    // Gom đơn hàng theo nhân viên
    const staffSpendingList = useMemo(() => {
        const orders = ordersRes?.success ? ordersRes.data : [];
        const staffMap = {};
        orders.forEach(order => {
            const staffId = order.shiftId?.workerId?._id || 'unknown';
            const staffName = order.shiftId?.workerId?.name || 'Nhân viên';

            if (!staffMap[staffId]) {
                staffMap[staffId] = {
                    staffId,
                    staffName,
                    totalSpent: 0,
                    orders: []
                };
            }

            staffMap[staffId].totalSpent += (Number(order.tienHang) || 0);
            staffMap[staffId].orders.push(order);
        });

        return Object.values(staffMap);
    }, [ordersRes]);

    const handleRefresh = useCallback(() => {
        refetchShifts();
        refetchOrders();
    }, [refetchShifts, refetchOrders]);

    const formatCurrency = (amount) => {
        return amount.toLocaleString('vi-VN') + 'đ';
    };

    const formatTime = (isoString) => {
        const d = new Date(isoString);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    if (loading && (!shiftsRes || !ordersRes)) {
        return (
            <View style={styles.centerContainer}>
                <Loading text="Đang tải thống kê..." />
            </View>
        );
    }

    const selectedStaff = staffSpendingList.find(s => s.staffId === selectedStaffId);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerUser}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{userInfo?.name?.charAt(0) || 'M'}</Text>
                    </View>
                    <View>
                        <Text style={styles.userName}>{userInfo?.name || 'Admin'}</Text>
                        <Text style={styles.userRole}>Quản trị viên</Text>
                    </View>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} />}
            >
                <Text style={styles.pageTitle}>Dashboard Quản lý</Text>

                {/* Start Stats Block */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Thống kê theo ngày</Text>

                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Đã giao cho nhân viên</Text>
                        <Text style={styles.statValueBold}>{formatCurrency(stats.totalTienGiaoCaTheoNgay)}</Text>
                    </View>

                    <View style={styles.statRow}>
                        <Text style={styles.statLabel}>Nhân viên đã chi</Text>
                        <Text style={[styles.statValueBold, { color: theme.colors.primary.default }]}>
                            {formatCurrency(stats.totalTienHangDaTraTheoNgay)}
                        </Text>
                    </View>

                    <View style={[styles.statRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                        <Text style={styles.statLabel}>Tiền hoa hồng công ty</Text>
                        <Text style={[styles.statValueBold, { color: theme.colors.success }]}>
                            {formatCurrency(stats.totalTienHoaHongTheoNgay)}
                        </Text>
                    </View>
                </View>

                {/* Danh sách nhân viên */}
                {staffSpendingList.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Nhân viên đã chi</Text>

                        {staffSpendingList.map((staff, index) => (
                            <View key={staff.staffId}>
                                <TouchableOpacity
                                    style={[
                                        styles.staffRow,
                                        index !== staffSpendingList.length - 1 && styles.borderBottom,
                                        selectedStaffId === staff.staffId && styles.selectedStaffRow
                                    ]}
                                    onPress={() => setSelectedStaffId(
                                        selectedStaffId === staff.staffId ? null : staff.staffId
                                    )}
                                >
                                    <View style={styles.staffRowLeft}>
                                        <Ionicons
                                            name={selectedStaffId === staff.staffId ? 'chevron-up' : 'chevron-down'}
                                            size={20}
                                            color={theme.colors.text.secondary}
                                            style={{ marginRight: 8 }}
                                        />
                                        <Text style={styles.staffName}>{staff.staffName}</Text>
                                    </View>
                                    <Text style={[styles.statValueBold, { color: theme.colors.primary.default }]}>
                                        {formatCurrency(staff.totalSpent)}
                                    </Text>
                                </TouchableOpacity>

                                {/* Sub-list Orders if selected */}
                                {selectedStaffId === staff.staffId && (
                                    <View style={styles.ordersContainer}>
                                        {staff.orders.map((order, oIndex) => (
                                            <View key={order.id} style={styles.orderItem}>
                                                <View style={styles.orderLeft}>
                                                    <View style={styles.orderBadge}>
                                                        <Text style={styles.orderBadgeText}>{oIndex + 1}</Text>
                                                    </View>
                                                    <View>
                                                        <Text style={styles.orderCustomer}>{order.customerName}</Text>
                                                        <Text style={styles.orderTime}>{formatTime(order.createdAt)}</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.orderAmount}>{formatCurrency(order.tienHang)}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background.light,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background.light,
    },
    header: {
        backgroundColor: theme.colors.surface.light,
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerUser: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.primary.light,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.primary.dark,
    },
    userName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
    },
    userRole: {
        fontSize: 14,
        color: theme.colors.text.secondary,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: 20,
    },
    card: {
        backgroundColor: theme.colors.surface.light,
        borderRadius: theme.borderRadius.lg,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: 16,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    statLabel: {
        fontSize: 14,
        color: theme.colors.text.primary,
    },
    statValueBold: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
    },
    staffRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    staffRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    staffName: {
        fontSize: 14,
        color: theme.colors.text.primary,
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    selectedStaffRow: {
        backgroundColor: theme.colors.primary.light + '40', // transparent tint
        borderRadius: 8,
        paddingHorizontal: 8,
        marginHorizontal: -8,
    },
    ordersContainer: {
        marginTop: 8,
        marginBottom: 16,
        paddingLeft: 16,
    },
    orderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.background.light,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginBottom: 8,
    },
    orderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    orderBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.primary.light,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    orderBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.primary.default,
    },
    orderCustomer: {
        fontSize: 14,
        fontWeight: 'medium',
        color: theme.colors.text.primary,
    },
    orderTime: {
        fontSize: 12,
        color: theme.colors.text.secondary,
    },
    orderAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: theme.colors.primary.default,
    }
});
