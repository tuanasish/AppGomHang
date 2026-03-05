import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { theme } from '../../theme/theme';
import { formatCurrency, formatDate, getLocalDateString } from '../../utils/helpers';

import { getCustomerByIdAPI } from '../../api/customers';
import { getOrdersByDateAPI } from '../../api/orders';

export default function CustomerDetailScreen({ route, navigation }) {
    // Nếu có route params, lấy customerId, còn để demo thì dùng static
    const customerId = route?.params?.customerId || '1';

    const [customer, setCustomer] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    useEffect(() => {
        loadData();
    }, [customerId, selectedDate]);

    const loadData = async () => {
        setLoading(true);
        try {
            const dateStr = getLocalDateString(selectedDate);
            const [customerRes, ordersRes] = await Promise.all([
                getCustomerByIdAPI(customerId),
                getOrdersByDateAPI(dateStr)
            ]);

            if (customerRes.success) {
                setCustomer(customerRes.data);
            }

            if (ordersRes.success) {
                const allOrders = ordersRes.data || [];
                // Filter orders by customerId
                const customerOrders = allOrders.filter(o => o.customerId === customerId);
                setOrders(customerOrders);
            }
        } catch (error) {
            console.error('Error loading customer detail:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (event, selected) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selected) {
            setSelectedDate(selected);
        }
    };

    const stats = {
        count: orders.length,
        totalAmount: orders.reduce((sum, order) => sum + order.tongTienHoaDon, 0),
    };

    const handleExportAllOrders = async () => {
        if (!customer || orders.length === 0) return;
        setIsGeneratingPDF(true);
        try {
            const removeDiacritics = (str) => {
                if (!str) return '';
                return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
            };

            const formattedDate = selectedDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

            const orderRowsHtml = orders.map((order, index) => {
                const orderDate = new Date(order.createdAt);
                const timeStr = `${orderDate.getHours().toString().padStart(2, '0')}:${orderDate.getMinutes().toString().padStart(2, '0')}`;
                return `
                    <tr class="table-row">
                        <td class="col-stt">${index + 1}</td>
                        <td class="col-counter">${removeDiacritics(order.counterName || 'N/A')}</td>
                        <td class="col-time">${timeStr}</td>
                        <td class="col-tienhang">${(order.tienHang || 0).toLocaleString('vi-VN')}d</td>
                        <td class="col-congom">${(order.tienCongGom || 0).toLocaleString('vi-VN')}d</td>
                        <td class="col-phidong">${(order.phiDongHang || 0).toLocaleString('vi-VN')}d</td>
                        <td class="col-total">${(order.tongTienHoaDon || 0).toLocaleString('vi-VN')}d</td>
                    </tr>
                `;
            }).join('');

            const totalTienHang = orders.reduce((s, o) => s + (o.tienHang || 0), 0);
            const totalCongGom = orders.reduce((s, o) => s + (o.tienCongGom || 0), 0);
            const totalPhiDong = orders.reduce((s, o) => s + (o.phiDongHang || 0), 0);
            const totalAll = orders.reduce((s, o) => s + (o.tongTienHoaDon || 0), 0);

            const htmlString = `
                <html>
                <head>
                    <meta charset="utf-8" />
                    <style>
                        @page { size: A4 landscape; margin: 12mm; }
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px 40px; color: #1a1a1a; font-size: 14px; line-height: 1.5; }
                        .header { margin-bottom: 8px; padding-bottom: 12px; border-bottom: 3px solid #2563eb; }
                        .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
                        .company-name { font-size: 20px; font-weight: bold; color: #2563eb; margin-bottom: 3px; }
                        .company-info { font-size: 12px; color: #666; margin-bottom: 2px; }
                        .invoice-title { font-size: 22px; font-weight: bold; color: #1a1a1a; text-align: right; padding-top: 5px; }
                        .meta-info { display: flex; justify-content: space-between; margin: 12px 0 20px 0; font-size: 14px; }
                        .customer-box { background: #f0f4ff; border-radius: 8px; padding: 12px 16px; }
                        .customer-box b { color: #2563eb; }
                        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        .table-header { background-color: #f0f4ff; font-weight: bold; font-size: 13px; color: #1a1a1a; border-bottom: 2px solid #2563eb; }
                        .table-header td { padding: 8px 6px; }
                        .table-row { border-bottom: 1px solid #e0e0e0; font-size: 13px; }
                        .table-row td { padding: 8px 6px; }
                        .table-footer { background-color: #f8fafc; font-weight: bold; font-size: 14px; border-top: 2px solid #2563eb; }
                        .table-footer td { padding: 10px 6px; }
                        .col-stt { width: 5%; text-align: center; }
                        .col-counter { width: 22%; }
                        .col-time { width: 10%; text-align: center; }
                        .col-tienhang { width: 16%; text-align: right; }
                        .col-congom { width: 16%; text-align: right; }
                        .col-phidong { width: 15%; text-align: right; }
                        .col-total { width: 16%; text-align: right; color: #2563eb; font-weight: 600; }
                        .grand-total { text-align: right; font-size: 20px; font-weight: bold; color: #2563eb; margin-top: 10px; }
                        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #333; padding-top: 12px; border-top: 1px solid #e0e0e0; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="header-top">
                            <div>
                                <div class="company-name">Gom Hang Ninh Hiep</div>
                                <div class="company-info">${removeDiacritics('Ninh Hiep, Gia Lam, Ha Noi')}</div>
                                <div class="company-info">0922238683</div>
                            </div>
                            <div class="invoice-title">${removeDiacritics('TONG HOP HOA DON')}</div>
                        </div>
                    </div>

                    <div class="meta-info">
                        <div class="customer-box">
                            <b>${removeDiacritics('Khach hang:')}</b> ${removeDiacritics(customer.name)}
                            ${customer.phone ? ` &nbsp;|&nbsp; <b>SDT:</b> ${customer.phone}` : ''}
                        </div>
                        <div style="text-align:right;">
                            <b>${removeDiacritics('Ngay:')}</b> ${formattedDate}<br/>
                            <b>${removeDiacritics('So don:')}</b> ${orders.length}
                        </div>
                    </div>

                    <table class="table">
                        <tr class="table-header">
                            <td class="col-stt">STT</td>
                            <td class="col-counter">${removeDiacritics('Quay')}</td>
                            <td class="col-time">${removeDiacritics('Gio')}</td>
                            <td class="col-tienhang">${removeDiacritics('Tien hang')}</td>
                            <td class="col-congom">${removeDiacritics('Cong gom')}</td>
                            <td class="col-phidong">${removeDiacritics('Phi dong')}</td>
                            <td class="col-total">${removeDiacritics('Tong')}</td>
                        </tr>
                        ${orderRowsHtml}
                        <tr class="table-footer">
                            <td class="col-stt"></td>
                            <td class="col-counter">${removeDiacritics('TONG CONG')}</td>
                            <td class="col-time">${orders.length} ${removeDiacritics('don')}</td>
                            <td class="col-tienhang">${totalTienHang.toLocaleString('vi-VN')}d</td>
                            <td class="col-congom">${totalCongGom.toLocaleString('vi-VN')}d</td>
                            <td class="col-phidong">${totalPhiDong.toLocaleString('vi-VN')}d</td>
                            <td class="col-total">${totalAll.toLocaleString('vi-VN')}d</td>
                        </tr>
                    </table>

                    <div class="grand-total">
                        ${removeDiacritics('TONG TIEN: ')}${totalAll.toLocaleString('vi-VN')}d
                    </div>

                    <div class="footer">
                        <p>${removeDiacritics('Cam on quy khach da su dung dich vu!')}</p>
                        <p>${removeDiacritics('Hotline ho tro:')} 0922238683</p>
                    </div>
                </body>
                </html>
            `;

            const safeFileName = removeDiacritics(customer.name).replace(/[^a-zA-Z0-9]/g, '_');
            const safeDateStr = formattedDate.replace(/\//g, '-');

            if (Platform.OS === 'web') {
                const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
                const blobUrl = URL.createObjectURL(blob);
                const printWindow = window.open(blobUrl, '_blank');
                if (printWindow) {
                    printWindow.onload = () => {
                        setTimeout(() => {
                            printWindow.print();
                            URL.revokeObjectURL(blobUrl);
                        }, 300);
                    };
                } else {
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = `${safeFileName}_${safeDateStr}.html`;
                    a.click();
                    URL.revokeObjectURL(blobUrl);
                }
            } else {
                const { uri } = await Print.printToFileAsync({ html: htmlString });
                const newUri = `${FileSystem.cacheDirectory}${safeFileName}.pdf`;
                await FileSystem.moveAsync({ from: uri, to: newUri });

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(newUri, {
                        mimeType: 'application/pdf',
                        dialogTitle: removeDiacritics(customer.name),
                        UTI: 'com.adobe.pdf'
                    });
                } else {
                    Alert.alert('Thành công', 'Đã tạo PDF tổng hợp hóa đơn.');
                }
            }
        } catch (error) {
            console.error('Error generating batch PDF:', error);
            if (Platform.OS === 'web') {
                window.alert('Có lỗi xảy ra khi tạo PDF. Vui lòng thử lại.');
            } else {
                Alert.alert('Lỗi', 'Có lỗi xảy ra khi tạo PDF. Vui lòng thử lại.');
            }
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const renderDateSelector = () => (
        <View style={styles.dateSelectorContainer}>
            <Text style={styles.dateLabel}>Chọn ngày để xem hóa đơn:</Text>
            <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
            >
                <Ionicons name="calendar-outline" size={20} color={theme?.colors?.text?.secondary || '#666'} />
                <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
            </TouchableOpacity>

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            )}
            <Text style={styles.currentDateText}>Đang xem: <Text style={{ fontWeight: '500' }}>{formatDate(selectedDate)}</Text></Text>
        </View>
    );

    const renderOrderCard = ({ item }) => {
        const orderDate = new Date(item.createdAt);
        const timeStr = `${orderDate.getHours().toString().padStart(2, '0')}:${orderDate.getMinutes().toString().padStart(2, '0')} - ${formatDate(orderDate)}`;

        return (
            <View style={styles.orderCard}>
                <View style={styles.orderCardHeader}>
                    <View>
                        <Text style={styles.counterName}>{item.counterName || 'Quầy'}</Text>
                        <Text style={styles.orderTime}>{timeStr}</Text>
                    </View>
                    <Text style={styles.orderTotal}>{formatCurrency(item.tongTienHoaDon)}</Text>
                </View>
            </View>
        );
    };

    if (loading && !customer) {
        return (
            <View style={[styles.container, styles.centerContent]}>
                <ActivityIndicator size="large" color={theme?.colors?.primary?.default || '#007AFF'} />
                <Text style={styles.loadingText}>Đang tải thông tin...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>Chi tiết khách hàng</Text>
                <View style={{ width: 40 }} />
            </View>

            <FlatList
                data={orders}
                keyExtractor={(item) => item.id}
                renderItem={renderOrderCard}
                contentContainerStyle={styles.listContainer}
                ListHeaderComponent={
                    <>
                        {customer && (
                            <View style={styles.customerInfoCard}>
                                <Text style={styles.customerName}>{customer.name}</Text>
                                {customer.phone && (
                                    <Text style={styles.customerDetailText}>
                                        <Text style={{ fontWeight: '500' }}>Số điện thoại:</Text> {customer.phone}
                                    </Text>
                                )}
                                {customer.address && (
                                    <Text style={styles.customerDetailText}>
                                        <Text style={{ fontWeight: '500' }}>Địa chỉ:</Text> {customer.address}
                                    </Text>
                                )}
                            </View>
                        )}

                        {renderDateSelector()}

                        <View style={styles.statsCard}>
                            <Text style={styles.statsCardTitle}>Hóa đơn ngày {formatDate(selectedDate)}</Text>

                            {loading ? (
                                <View style={{ padding: 20 }}>
                                    <ActivityIndicator size="small" color={theme?.colors?.primary?.default || '#007AFF'} />
                                </View>
                            ) : (
                                <View style={styles.statsGrid}>
                                    <View style={styles.statsItem}>
                                        <Text style={styles.statsLabel}>Số lượng hóa đơn</Text>
                                        <Text style={styles.statsValue}>{stats.count}</Text>
                                    </View>
                                    <View style={styles.statsItem}>
                                        <Text style={styles.statsLabel}>Tổng tiền</Text>
                                        <Text style={[styles.statsValue, { color: theme?.colors?.primary?.default || '#007AFF' }]}>
                                            {formatCurrency(stats.totalAmount)}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {!loading && stats.count > 0 && (
                                <TouchableOpacity
                                    style={[styles.exportButton, isGeneratingPDF && { opacity: 0.6 }]}
                                    onPress={handleExportAllOrders}
                                    disabled={isGeneratingPDF}
                                >
                                    {isGeneratingPDF ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Ionicons name="receipt-outline" size={20} color="#FFF" />
                                    )}
                                    <Text style={styles.exportButtonText}>
                                        {isGeneratingPDF ? 'Đang tạo PDF...' : 'Xuất hóa đơn PDF'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <Text style={styles.listSectionTitle}>Danh sách hóa đơn</Text>
                    </>
                }
                ListEmptyComponent={
                    !loading && (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Không có hóa đơn nào trong ngày này</Text>
                        </View>
                    )
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 15,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: theme?.typography?.sizes?.xl || 20,
        fontWeight: 'bold',
        color: '#000',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
    },
    listContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    customerInfoCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    customerName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 12,
    },
    customerDetailText: {
        fontSize: 15,
        color: '#444',
        marginBottom: 8,
    },
    dateSelectorContainer: {
        marginBottom: 16,
    },
    dateLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E5EA',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
    },
    dateText: {
        marginLeft: 8,
        fontSize: 15,
        color: '#000',
    },
    currentDateText: {
        fontSize: 13,
        color: '#666',
        marginTop: 8,
    },
    statsCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    statsCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statsItem: {
        flex: 1,
    },
    statsLabel: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    statsValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#000',
    },
    exportButton: {
        flexDirection: 'row',
        backgroundColor: theme?.colors?.primary?.default || '#007AFF',
        borderRadius: 8,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    exportButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    listSectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        marginBottom: 12,
    },
    orderCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    orderCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    counterName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    orderTime: {
        fontSize: 13,
        color: '#666',
    },
    orderTotal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme?.colors?.primary?.default || '#007AFF',
    },
    emptyContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    emptyText: {
        fontSize: 15,
        color: '#666',
    },
});
