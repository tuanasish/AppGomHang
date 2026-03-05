import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    TextInput,
    Alert,
    Platform,
    ScrollView,
    Keyboard,
    TouchableWithoutFeedback,
    KeyboardAvoidingView
} from 'react-native';
import { showError } from '../../utils/errorHelper';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../../theme/theme';
import { formatCurrency, formatDate, getLocalDateString } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

import { useOrdersByDate, useUpdateOrder } from '../../hooks/queries/useOrders';

export default function ManagerOrdersScreen({ navigation }) {
    const { userInfo } = useAuth();

    const [filterDate, setFilterDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [editForm, setEditForm] = useState({
        tienHang: '0',
        tienCongGom: '0',
        phiDongHang: '0',
        tienHoaHong: '0',
        tienThem: '0',
        loaiTienThem: ''
    });

    const dateStr = getLocalDateString(filterDate);
    const { data: ordersRes, isLoading, refetch, isRefetching } = useOrdersByDate(dateStr);
    const updateOrderMutation = useUpdateOrder();

    const loading = isLoading;

    // Derived state for filtered orders
    const orders = React.useMemo(() => {
        const list = ordersRes?.success ? ordersRes.data : [];
        if (filterStatus === 'all') return list;
        return list.filter(o => o.status === filterStatus);
    }, [ordersRes, filterStatus]);

    const handleDateChange = (event, selected) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selected) setFilterDate(selected);
    };

    const executeApprove = async (id) => {
        try {
            await updateOrderMutation.mutateAsync({ orderId: id, orderData: { status: 'completed' } });
            Alert.alert('Thành công', 'Đã duyệt đơn hàng');
        } catch (error) {
            console.error('Approve order error:', error);
            showError(error, 'duyệt đơn hàng');
        }
    };

    const handleApprove = (id) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Duyệt đơn hàng này?')) {
                executeApprove(id);
            }
        } else {
            Alert.alert('Xác nhận', 'Duyệt đơn hàng này?', [
                { text: 'Hủy' },
                { text: 'Duyệt', onPress: () => executeApprove(id) }
            ]);
        }
    };

    const executeCancel = async (id) => {
        try {
            await updateOrderMutation.mutateAsync({ orderId: id, orderData: { status: 'cancelled' } });
            Alert.alert('Thành công', 'Đã hủy đơn hàng');
        } catch (error) {
            console.error('Cancel order error:', error);
            showError(error, 'hủy đơn hàng');
        }
    };

    const handleCancel = (id) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Hủy đơn hàng này?')) {
                executeCancel(id);
            }
        } else {
            Alert.alert('Xác nhận', 'Hủy đơn hàng này?', [
                { text: 'Không' },
                { text: 'Hủy đơn', style: 'destructive', onPress: () => executeCancel(id) }
            ]);
        }
    };

    const openEditModal = (order) => {
        setEditingOrder(order);
        setEditForm({
            tienHang: order.tienHang.toString(),
            tienCongGom: order.tienCongGom.toString(),
            phiDongHang: order.phiDongHang.toString(),
            tienHoaHong: (order.tienHoaHong || 0).toString(),
            tienThem: (order.tienThem || 0).toString(),
            loaiTienThem: order.loaiTienThem || ''
        });
        setEditModalVisible(true);
    };

    const handleSaveEdit = async () => {
        const tienHang = parseInt(editForm.tienHang) || 0;
        const tienCongGom = parseInt(editForm.tienCongGom) || 0;
        const phiDongHang = parseInt(editForm.phiDongHang) || 0;
        const tienHoaHong = parseInt(editForm.tienHoaHong) || 0;
        const tienThem = parseInt(editForm.tienThem) || 0;

        const payload = {
            tienHang,
            tienCongGom,
            phiDongHang,
            tienHoaHong,
            tienThem,
            loaiTienThem: editForm.loaiTienThem || null,
            tongTienHoaDon: tienHang + tienCongGom + phiDongHang + tienHoaHong + tienThem
        };

        try {
            await updateOrderMutation.mutateAsync({ orderId: editingOrder.id, orderData: payload });
            Alert.alert('Thành công', 'Đã lưu thay đổi');
            setEditModalVisible(false);
        } catch (error) {
            console.error('Update order error:', error);
            showError(error, 'cập nhật đơn hàng');
        }
    };

    const getStatusInfo = (status) => {
        switch (status) {
            case 'completed': return { label: 'Đã duyệt', color: '#4CAF50', bg: '#E8F5E9' };
            case 'pending': return { label: 'Chờ xử lý', color: '#FF9800', bg: '#FFF3E0' };
            case 'cancelled': return { label: 'Đã hủy', color: '#F44336', bg: '#FFEBEE' };
            default: return { label: status, color: '#666', bg: '#F2F2F7' };
        }
    };

    const renderItem = ({ item }) => {
        const sInfo = getStatusInfo(item.status);
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
                        <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: sInfo.bg }]}>
                        <Text style={[styles.statusText, { color: sInfo.color }]}>{sInfo.label}</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Khách hàng:</Text>
                        <Text style={styles.value}>{item.customerName || 'Khách vãng lai'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Nhân viên:</Text>
                        <Text style={styles.value}>{item.staffName || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Quầy:</Text>
                        <Text style={styles.value}>{item.counterName || '---'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Tổng tiền:</Text>
                        <Text style={styles.totalValue}>{formatCurrency(item.tongTienHoaDon)}</Text>
                    </View>
                </View>

                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.btnDetail} onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}>
                        <Text style={styles.btnDetailText}>Chi tiết</Text>
                    </TouchableOpacity>
                    {userInfo?.role === 'admin' && (
                        <TouchableOpacity style={styles.btnEdit} onPress={() => openEditModal(item)}>
                            <Text style={styles.btnEditText}>Sửa</Text>
                        </TouchableOpacity>
                    )}
                    {item.status === 'pending' && (
                        <>
                            <TouchableOpacity style={styles.btnApprove} onPress={() => handleApprove(item.id)}>
                                <Text style={styles.btnApproveText}>Duyệt</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnCancel} onPress={() => handleCancel(item.id)}>
                                <Text style={styles.btnCancelText}>Hủy</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Danh sách Đơn hàng</Text>
            </View>

            <View style={styles.filterSection}>
                <TouchableOpacity style={styles.dateFilter} onPress={() => setShowDatePicker(true)}>
                    <Ionicons name="calendar-outline" size={20} color="#333" />
                    <Text style={styles.dateFilterText}>{formatDate(filterDate)}</Text>
                </TouchableOpacity>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilters}>
                    {['all', 'pending', 'completed', 'cancelled'].map(status => (
                        <TouchableOpacity
                            key={status}
                            style={[styles.statusBtn, filterStatus === status && styles.statusBtnActive]}
                            onPress={() => setFilterStatus(status)}
                        >
                            <Text style={[styles.statusBtnText, filterStatus === status && styles.statusBtnTextActive]}>
                                {status === 'all' ? 'Tất cả' : getStatusInfo(status).label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={filterDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}

            {loading && !ordersRes ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme?.colors?.primary?.default || '#007AFF'} />
                </View>
            ) : (
                <FlatList
                    data={orders}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={<Text style={styles.emptyText}>Không tìm thấy đơn hàng</Text>}
                    refreshing={isRefetching}
                    onRefresh={refetch}
                />
            )}

            <Modal visible={editModalVisible} transparent={true} animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback>
                                <View style={styles.modalContent}>
                                    <View style={styles.modalHeader}>
                                        <Text style={styles.modalTitle}>Sửa hóa đơn</Text>
                                        <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                            <Ionicons name="close" size={24} color="#333" />
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={styles.inputLabel}>Tiền hàng</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={editForm.tienHang}
                                        onChangeText={t => setEditForm(prev => ({ ...prev, tienHang: t }))}
                                    />

                                    <Text style={styles.inputLabel}>Tiền công gom</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={editForm.tienCongGom}
                                        onChangeText={t => setEditForm(prev => ({ ...prev, tienCongGom: t }))}
                                    />

                                    <Text style={styles.inputLabel}>Phí đóng hàng</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={editForm.phiDongHang}
                                        onChangeText={t => setEditForm(prev => ({ ...prev, phiDongHang: t }))}
                                    />

                                    <Text style={styles.inputLabel}>Tiền hoa hồng</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={editForm.tienHoaHong}
                                        onChangeText={t => setEditForm(prev => ({ ...prev, tienHoaHong: t }))}
                                    />

                                    <Text style={styles.inputLabel}>Tiền thuế</Text>
                                    <TextInput
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={editForm.tienThem}
                                        onChangeText={t => setEditForm(prev => ({ ...prev, tienThem: t }))}
                                    />

                                    <Text style={styles.inputLabel}>Loại thuế (VD: Thuế 1.5%)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editForm.loaiTienThem}
                                        placeholder="Thuế 1.5%..."
                                        onChangeText={t => setEditForm(prev => ({ ...prev, loaiTienThem: t }))}
                                    />

                                    <View style={styles.quickTaxContainer}>
                                        <TouchableOpacity
                                            style={styles.quickTaxBtn}
                                            onPress={() => {
                                                const tongChuaThue = parseInt(editForm.tienHang) || 0;
                                                const thue = Math.round(tongChuaThue * 0.015);
                                                setEditForm(prev => ({
                                                    ...prev,
                                                    tienThem: thue.toString(),
                                                    loaiTienThem: 'Thuế 1.5%'
                                                }));
                                            }}
                                        >
                                            <Text style={styles.quickTaxText}>+ Thuế 1.5%</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.quickTaxBtn, styles.quickTaxBtnZero]}
                                            onPress={() => setEditForm(prev => ({ ...prev, tienThem: '0', loaiTienThem: '' }))}
                                        >
                                            <Text style={styles.quickTaxText}>0% (Không thuế)</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <TouchableOpacity style={styles.submitBtn} onPress={handleSaveEdit}>
                                        <Text style={styles.submitBtnText}>Lưu thay đổi</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    header: {
        paddingHorizontal: 16, paddingTop: 60, paddingBottom: 15,
        backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA'
    },
    title: { fontSize: 24, fontWeight: 'bold', color: '#000' },
    filterSection: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
    dateFilter: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F7',
        padding: 12, borderRadius: 8, marginBottom: 12
    },
    dateFilterText: { marginLeft: 8, fontSize: 15, fontWeight: '500' },
    statusFilters: { flexDirection: 'row' },
    statusBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F2F2F7', marginRight: 8 },
    statusBtnActive: { backgroundColor: theme?.colors?.primary?.default || '#007AFF' },
    statusBtnText: { fontSize: 13, fontWeight: '500', color: '#666' },
    statusBtnTextActive: { color: '#FFF' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContainer: { padding: 16, paddingBottom: 100 },
    card: {
        backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    orderId: { fontSize: 16, fontWeight: 'bold' },
    orderDate: { fontSize: 13, color: '#666', marginTop: 4 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
    statusText: { fontSize: 12, fontWeight: 'bold' },
    cardBody: { borderTopWidth: 1, borderTopColor: '#F2F2F7', paddingTop: 12, marginBottom: 16 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    label: { color: '#666', fontSize: 14 },
    value: { fontWeight: '500', fontSize: 14 },
    totalValue: { fontWeight: 'bold', fontSize: 16, color: theme?.colors?.primary?.default || '#007AFF' },
    cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    btnDetail: { flex: 1, paddingVertical: 10, backgroundColor: '#E6F0FF', borderRadius: 8, alignItems: 'center' },
    btnDetailText: { color: theme?.colors?.primary?.default || '#007AFF', fontWeight: 'bold' },
    btnEdit: { flex: 1, paddingVertical: 10, backgroundColor: '#FFF3E0', borderRadius: 8, alignItems: 'center' },
    btnEditText: { color: '#FF9800', fontWeight: 'bold' },
    btnApprove: { flex: 1, paddingVertical: 10, backgroundColor: '#E8F5E9', borderRadius: 8, alignItems: 'center' },
    btnApproveText: { color: '#4CAF50', fontWeight: 'bold' },
    btnCancel: { flex: 1, paddingVertical: 10, backgroundColor: '#FFEBEE', borderRadius: 8, alignItems: 'center' },
    btnCancelText: { color: '#F44336', fontWeight: 'bold' },
    emptyText: { textAlign: 'center', color: '#8E8E93', marginTop: 40, fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    inputLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8, color: '#333' },
    input: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 16 },
    quickTaxContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    quickTaxBtn: { flex: 1, backgroundColor: '#E3F2FD', padding: 10, borderRadius: 8, alignItems: 'center', marginRight: 10 },
    quickTaxBtnZero: { backgroundColor: '#FFF3E0', marginRight: 0 },
    quickTaxText: { color: '#1976D2', fontWeight: 'bold', fontSize: 13 },
    submitBtn: { backgroundColor: theme?.colors?.primary?.default || '#007AFF', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 10 },
    submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
