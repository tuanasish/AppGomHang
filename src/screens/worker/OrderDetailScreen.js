import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import Button from '../../components/common/Button';
import { getOrderByIdAPI } from '../../api/orders';
const { spacing, typography, borderRadius } = theme;
const colors = {
    background: theme.colors.background.light,
    surface: theme.colors.surface.light,
    primary: theme.colors.primary.default,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
    textInfo: theme.colors.text.primary,
    gray100: '#f3f4f6',
    gray200: '#e5e7eb',
    gray400: '#9ca3af',
    gray500: '#6b7280',
    gray600: '#4b5563',
    gray700: '#374151',
    gray800: '#1f2937',
    gray900: '#111827',
    blue50: '#eff6ff',
    blue200: '#bfdbfe',
    blue500: '#3b82f6',
    errorBackground: '#fee2e2',
    errorLight: '#fca5a5',
    errorBorder: '#f87171',
};
const shadows = {
    sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
};

const OrderDetailScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { orderId } = route.params || {};

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    useEffect(() => {
        loadOrder();
    }, [orderId]);

    const loadOrder = async () => {
        if (!orderId) {
            setError('Không tìm thấy mã đơn hàng');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await getOrderByIdAPI(orderId);
            if (response && response.success && response.data) {
                setOrder(response.data);
            } else {
                setError('Không tìm thấy đơn hàng');
            }
        } catch (err) {
            console.error('Load order detail error:', err);
            setError('Không tìm thấy đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const dateStr = date.toLocaleDateString('vi-VN');
        const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        return `${timeStr} - ${dateStr}`;
    };

    const handleExportPDF = async () => {
        if (!order) return;
        setIsGeneratingPDF(true);
        try {
            const removeDiacritics = (str) => {
                if (!str) return '';
                return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
            };

            const dateObj = new Date(order.createdAt || order.ngayLamGom);
            const formattedDate = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

            const htmlString = `
                <html>
                <head>
                    <meta charset="utf-8" />
                    <style>
                        @page { size: A4; margin: 15mm; }
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { 
                            font-family: 'Segoe UI', Arial, sans-serif; 
                            padding: 40px 50px; 
                            color: #1a1a1a; 
                            font-size: 15px; 
                            line-height: 1.6;
                        }
                        .header { 
                            margin-bottom: 10px;
                            padding-bottom: 15px;
                            border-bottom: 3px solid #2563eb;
                        }
                        .header-top {
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                        }
                        .company-name { 
                            font-size: 22px; 
                            font-weight: bold; 
                            color: #2563eb; 
                            margin-bottom: 4px; 
                        }
                        .company-info { 
                            font-size: 13px; 
                            margin-bottom: 2px; 
                            color: #666; 
                        }
                        .invoice-title { 
                            font-size: 24px; 
                            font-weight: bold; 
                            color: #1a1a1a;
                            text-align: right;
                            padding-top: 5px;
                        }
                        .invoice-date { 
                            text-align: right; 
                            margin-bottom: 25px; 
                            margin-top: 10px;
                            font-size: 14px; 
                            color: #444;
                        }
                        .section-title { 
                            font-size: 17px; 
                            font-weight: bold; 
                            margin-bottom: 10px; 
                            color: #2563eb;
                        }
                        .customer-info { 
                            margin-bottom: 25px; 
                            font-size: 15px; 
                            line-height: 1.8;
                        }
                        .customer-info p { margin-bottom: 4px; }
                        .table { 
                            width: 100%; 
                            border-collapse: collapse; 
                            margin-bottom: 30px; 
                        }
                        .table-header { 
                            background-color: #f0f4ff; 
                            font-weight: bold; 
                            font-size: 14px;
                            color: #1a1a1a;
                            border-bottom: 2px solid #2563eb;
                        }
                        .table-header td { 
                            padding: 10px 8px; 
                        }
                        .table-row { 
                            border-bottom: 1px solid #e0e0e0; 
                            font-size: 14px; 
                        }
                        .table-row td { 
                            padding: 10px 8px; 
                        }
                        .col-stt { width: 8%; text-align: center; }
                        .col-desc { width: 32%; }
                        .col-qty { width: 15%; text-align: center; }
                        .col-price { width: 22%; text-align: right; }
                        .col-total { width: 23%; text-align: right; }
                        .summary { 
                            margin-top: 10px; 
                            margin-bottom: 10px;
                        }
                        .summary-row { 
                            display: flex; 
                            justify-content: space-between; 
                            margin-bottom: 8px; 
                            font-size: 15px; 
                        }
                        .summary-label { font-weight: 600; color: #333; }
                        .divider { 
                            border-bottom: 2px solid #1a1a1a; 
                            margin-top: 15px; 
                            margin-bottom: 15px; 
                        }
                        .total-row { 
                            display: flex; 
                            justify-content: space-between; 
                            font-size: 20px; 
                            font-weight: bold; 
                            color: #2563eb;
                            padding: 8px 0;
                        }
                        .footer { 
                            margin-top: 50px; 
                            text-align: center; 
                            font-size: 13px; 
                            color: #333; 
                            padding-top: 15px;
                            border-top: 1px solid #e0e0e0;
                        }
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
                            <div class="invoice-title">${removeDiacritics('HOA DON BAN HANG')}</div>
                        </div>
                    </div>

                    <div class="invoice-date">
                        <b>${removeDiacritics('Ngay: ')}</b>${formattedDate}
                    </div>

                    <div class="customer-info">
                        <div class="section-title">${removeDiacritics('Thong tin khach hang')}</div>
                        <p><b>${removeDiacritics('Ten: ')}</b>${removeDiacritics(order.customerName || 'N/A')}</p>
                        ${order.customerPhone ? `<p><b>SDT: </b>${order.customerPhone}</p>` : ''}
                        ${order.counterName ? `<p><b>${removeDiacritics('Quay/Vi tri: ')}</b>${removeDiacritics(order.counterName)}</p>` : ''}
                    </div>

                    <table class="table">
                        <tr class="table-header">
                            <td class="col-stt">STT</td>
                            <td class="col-desc">${removeDiacritics('Mo ta')}</td>
                            <td class="col-qty">${removeDiacritics('So luong')}</td>
                            <td class="col-price">${removeDiacritics('Don gia')}</td>
                            <td class="col-total">${removeDiacritics('Thanh tien')}</td>
                        </tr>
                        <tr class="table-row">
                            <td class="col-stt">1</td>
                            <td class="col-desc">${removeDiacritics('Dich vu gom hang')}</td>
                            <td class="col-qty">1</td>
                            <td class="col-price">${(order.tongTienHoaDon || 0).toLocaleString('vi-VN')}d</td>
                            <td class="col-total">${(order.tongTienHoaDon || 0).toLocaleString('vi-VN')}d</td>
                        </tr>
                    </table>

                    <div class="summary">
                        <div class="section-title">${removeDiacritics('Chi tiet thanh toan')}</div>
                        <div class="summary-row">
                            <span class="summary-label">${removeDiacritics('Tien hang:')}</span>
                            <span>${(order.tienHang || 0).toLocaleString('vi-VN')}d</span>
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">${removeDiacritics('Tien cong gom:')}</span>
                            <span>${(order.tienCongGom || 0).toLocaleString('vi-VN')}d</span>
                        </div>
                        <div class="summary-row">
                            <span class="summary-label">${removeDiacritics('Phi dong hang:')}</span>
                            <span>${(order.phiDongHang || 0).toLocaleString('vi-VN')}d</span>
                        </div>
                        ${order.tienHoaHong > 0 ? `
                        <div class="summary-row">
                            <span class="summary-label">${removeDiacritics('Tien hoa hong:')}</span>
                            <span>${(order.tienHoaHong || 0).toLocaleString('vi-VN')}d</span>
                        </div>` : ''}
                        ${order.tienThem && order.tienThem > 0 ? `
                        <div class="summary-row">
                            <span class="summary-label">${removeDiacritics(order.loaiTienThem || 'Tien them')}:</span>
                            <span>${(order.tienThem || 0).toLocaleString('vi-VN')}d</span>
                        </div>` : ''}
                        
                        <div class="divider"></div>
                    </div>

                    <div class="total-row">
                        <span>${removeDiacritics('TONG TIEN:')}</span>
                        <span>${(order.tongTienHoaDon || 0).toLocaleString('vi-VN')}d</span>
                    </div>

                    <div class="footer">
                        <p>${removeDiacritics('Cam on quy khach da su dung dich vu!')}</p>
                        <p>${removeDiacritics('Hotline ho tro:')} 0922238683</p>
                    </div>
                </body>
                </html>
            `;

            if (Platform.OS === 'web') {
                // Open HTML in new tab via Blob URL - reliable approach with full CSS
                const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
                const blobUrl = URL.createObjectURL(blob);
                const printWindow = window.open(blobUrl, '_blank');

                if (printWindow) {
                    printWindow.onload = () => {
                        setTimeout(() => {
                            printWindow.print();
                            // Clean up blob URL after printing
                            URL.revokeObjectURL(blobUrl);
                        }, 300);
                    };
                } else {
                    // If popup blocked, fallback to direct download as HTML
                    const a = document.createElement('a');
                    a.href = blobUrl;
                    a.download = `hoadon_${order.id ? order.id.slice(0, 8) : 'export'}_${formattedDate.replace(/\//g, '-')}.html`;
                    a.click();
                    URL.revokeObjectURL(blobUrl);
                }
            } else {
                const { uri } = await Print.printToFileAsync({
                    html: htmlString
                });

                // Rename to short filename
                const newUri = `${FileSystem.cacheDirectory}hoadon.pdf`;
                await FileSystem.moveAsync({ from: uri, to: newUri });

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(newUri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Hoa don',
                        UTI: 'com.adobe.pdf'
                    });
                } else {
                    Alert.alert('Thành công', 'Đã tạo hóa đơn PDF.');
                }
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            if (Platform.OS === 'web') {
                window.alert('Có lỗi xảy ra khi tạo PDF. Vui lòng thử lại.');
            } else {
                Alert.alert('Lỗi', 'Có lỗi xảy ra khi tạo PDF. Vui lòng thử lại.');
            }
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.textInfo} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Chi tiết Hóa đơn</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Đang tải thông tin đơn hàng...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.textInfo} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết Hóa đơn</Text>
                <View style={{ width: 24 }} />
            </View>

            {error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorBackBtn}>
                        <Text style={styles.errorBackText}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            ) : order && (
                <>
                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* General Info */}
                        <View style={styles.cardSection}>
                            <Text style={styles.customerName}>Khách hàng: {order.customerName || 'N/A'}</Text>
                            <View style={styles.metaInfo}>
                                <Text style={styles.metaText}>Mã đơn: #{order.id.slice(0, 8)}</Text>
                                <Text style={styles.metaText}>Quầy: {order.counterName || 'N/A'}</Text>
                                <Text style={styles.metaText}>Tạo lúc: {formatDateTime(order.createdAt)} | NV: {order.staffName || 'N/A'}</Text>
                            </View>
                        </View>

                        {/* Money Details */}
                        <View style={styles.cardSection}>
                            <Text style={styles.sectionTitle}>Chi tiết tiền</Text>

                            <View style={styles.moneyRow}>
                                <Text style={styles.moneyLabel}>Tiền hàng (trả cho quầy)</Text>
                                <Text style={styles.moneyValue}>{(order.tienHang || 0).toLocaleString('vi-VN')}đ</Text>
                            </View>

                            <View style={styles.moneyRow}>
                                <Text style={styles.moneyLabel}>Tiền công gom</Text>
                                <Text style={styles.moneyValue}>{(order.tienCongGom || 0).toLocaleString('vi-VN')}đ</Text>
                            </View>

                            <View style={styles.moneyRow}>
                                <Text style={styles.moneyLabel}>Phí đóng hàng</Text>
                                <Text style={styles.moneyValue}>{(order.phiDongHang || 0).toLocaleString('vi-VN')}đ</Text>
                            </View>

                            {order.tienHoaHong > 0 && (
                                <View style={[styles.moneyRow, styles.borderTop]}>
                                    <Text style={styles.moneyLabel}>Tiền hoa hồng</Text>
                                    <Text style={styles.moneyValue}>{(order.tienHoaHong || 0).toLocaleString('vi-VN')}đ</Text>
                                </View>
                            )}

                            {(order.tienThem !== undefined && order.tienThem !== null && order.tienThem > 0) && (
                                <View style={[styles.moneyRow, styles.borderTop]}>
                                    <Text style={styles.moneyLabel}>{order.loaiTienThem || 'Tiền thêm'}</Text>
                                    <Text style={styles.moneyValue}>{(order.tienThem || 0).toLocaleString('vi-VN')}đ</Text>
                                </View>
                            )}

                            <View style={[styles.moneyRow, styles.borderTop, styles.totalRow]}>
                                <Text style={styles.totalLabel}>Tổng tiền hóa đơn (khách phải trả)</Text>
                                <Text style={styles.totalValue}>{(order.tongTienHoaDon || 0).toLocaleString('vi-VN')}đ</Text>
                            </View>
                        </View>
                    </ScrollView>

                    {/* Bottom Actions */}
                    <View style={styles.bottomActions}>
                        <Button
                            title="Xuất bill PDF"
                            onPress={handleExportPDF}
                            loading={isGeneratingPDF}
                            disabled={isGeneratingPDF}
                            icon={<Ionicons name="document-text-outline" size={20} color="white" />}
                            style={styles.actionButton}
                        />
                        <Button
                            title="Chia sẻ"
                            onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}
                            variant="outline"
                            icon={<Ionicons name="share-social-outline" size={20} color={colors.primary} />}
                            style={styles.actionButton}
                        />
                    </View>
                </>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: colors.gray200,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
        color: colors.textInfo,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        color: colors.gray600,
    },
    errorContainer: {
        margin: spacing.lg,
        padding: spacing.lg,
        backgroundColor: colors.errorBackground,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.errorBorder,
    },
    errorText: {
        color: colors.error,
        fontSize: typography.sizes.sm,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    errorBackText: {
        color: colors.error,
        textAlign: 'center',
        textDecorationLine: 'underline',
    },
    scrollContent: {
        flex: 1,
    },
    cardSection: {
        backgroundColor: '#fff',
        padding: spacing.lg,
        marginBottom: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray200,
    },
    customerName: {
        fontSize: typography.sizes.xl,
        fontWeight: typography.weights.bold,
        color: colors.gray900,
        marginBottom: spacing.sm,
    },
    metaInfo: {
        gap: 4,
    },
    metaText: {
        fontSize: typography.sizes.sm,
        color: colors.gray500,
    },
    sectionTitle: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.semibold,
        color: colors.gray900,
        marginBottom: spacing.md,
    },
    moneyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
    },
    borderTop: {
        borderTopWidth: 1,
        borderTopColor: colors.gray200,
        marginTop: spacing.xs,
        paddingTop: spacing.sm,
    },
    totalRow: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
    },
    moneyLabel: {
        fontSize: typography.sizes.md,
        color: colors.gray600,
    },
    moneyValue: {
        fontSize: typography.sizes.md,
        color: colors.gray900,
    },
    totalLabel: {
        fontSize: typography.sizes.md,
        fontWeight: typography.weights.bold,
        color: colors.gray600,
    },
    totalValue: {
        fontSize: typography.sizes.lg,
        fontWeight: typography.weights.bold,
        color: colors.gray900,
    },
    bottomActions: {
        backgroundColor: '#fff',
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.gray200,
        gap: spacing.sm,
        ...shadows.md,
    },
    actionButton: {
        // marginBottom: spacing.sm,
    },
});

export default OrderDetailScreen;
