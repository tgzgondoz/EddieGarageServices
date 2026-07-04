// screens/SalesHistoryScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Dimensions,
  Animated,
  Modal,
  ScrollView,
} from 'react-native';
import { database } from '../config/firebase';
import { ref, onValue, off } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function SalesHistoryScreen({ navigation }) {
  const [sales, setSales] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [avgProfitMargin, setAvgProfitMargin] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('all'); // 'all', 'today', 'week', 'month'
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  useEffect(() => {
    const salesRef = ref(database, 'sales');
    
    const unsubscribe = onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const salesData = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        
        salesData.sort((a, b) => {
          const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
          const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
          return dateB - dateA;
        });
        
        let revenue = 0;
        let profit = 0;
        let cost = 0;
        let items = 0;
        let marginCount = 0;
        let marginSum = 0;
        
        salesData.forEach(sale => {
          revenue += sale.total || 0;
          
          // Calculate profit for each sale
          if (sale.items && sale.items.length > 0) {
            let saleProfit = 0;
            let saleCost = 0;
            
            sale.items.forEach(item => {
              const quantity = item.quantity || 1;
              const purchasePrice = item.purchasePrice || 0;
              const sellingPrice = item.price || 0;
              const itemCost = purchasePrice * quantity;
              const itemRevenue = sellingPrice * quantity;
              const itemProfit = itemRevenue - itemCost;
              
              saleProfit += itemProfit;
              saleCost += itemCost;
              
              // Calculate margin for this item
              if (sellingPrice > 0) {
                marginSum += ((sellingPrice - purchasePrice) / sellingPrice) * 100;
                marginCount++;
              }
            });
            
            profit += saleProfit;
            cost += saleCost;
          }
          
          items += sale.items?.length || 0;
        });
        
        setSales(salesData);
        setTotalRevenue(revenue);
        setTotalProfit(profit);
        setTotalCost(cost);
        setTotalItems(items);
        setAvgProfitMargin(marginCount > 0 ? marginSum / marginCount : 0);
      } else {
        setSales([]);
        setTotalRevenue(0);
        setTotalProfit(0);
        setTotalCost(0);
        setTotalItems(0);
        setAvgProfitMargin(0);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching sales:', error);
      Alert.alert('Error', 'Failed to fetch sales history');
      setLoading(false);
    });

    return () => off(salesRef);
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getFilteredSales = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return sales.filter(sale => {
      if (!sale.timestamp) return false;
      const saleDate = new Date(sale.timestamp);
      
      switch (filterPeriod) {
        case 'today':
          return saleDate >= today;
        case 'week':
          return saleDate >= weekAgo;
        case 'month':
          return saleDate >= monthAgo;
        default:
          return true;
      }
    });
  };

  const getFilteredStats = () => {
    const filtered = getFilteredSales();
    let revenue = 0;
    let profit = 0;
    let cost = 0;
    let items = 0;
    let marginCount = 0;
    let marginSum = 0;
    
    filtered.forEach(sale => {
      revenue += sale.total || 0;
      
      if (sale.items && sale.items.length > 0) {
        let saleProfit = 0;
        let saleCost = 0;
        
        sale.items.forEach(item => {
          const quantity = item.quantity || 1;
          const purchasePrice = item.purchasePrice || 0;
          const sellingPrice = item.price || 0;
          const itemCost = purchasePrice * quantity;
          const itemRevenue = sellingPrice * quantity;
          const itemProfit = itemRevenue - itemCost;
          
          saleProfit += itemProfit;
          saleCost += itemCost;
          
          if (sellingPrice > 0) {
            marginSum += ((sellingPrice - purchasePrice) / sellingPrice) * 100;
            marginCount++;
          }
        });
        
        profit += saleProfit;
        cost += saleCost;
      }
      
      items += sale.items?.length || 0;
    });
    
    return { 
      revenue, 
      profit, 
      cost, 
      items, 
      count: filtered.length,
      avgMargin: marginCount > 0 ? marginSum / marginCount : 0
    };
  };

  const calculateSaleProfit = (sale) => {
    if (!sale.items || sale.items.length === 0) return { profit: 0, cost: 0, margin: 0 };
    
    let totalProfit = 0;
    let totalCost = 0;
    let totalRevenue = 0;
    
    sale.items.forEach(item => {
      const quantity = item.quantity || 1;
      const purchasePrice = item.purchasePrice || 0;
      const sellingPrice = item.price || 0;
      const itemCost = purchasePrice * quantity;
      const itemRevenue = sellingPrice * quantity;
      
      totalCost += itemCost;
      totalRevenue += itemRevenue;
      totalProfit += (itemRevenue - itemCost);
    });
    
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    return { profit: totalProfit, cost: totalCost, margin };
  };

  const renderSale = ({ item, index }) => {
    const { profit, margin } = calculateSaleProfit(item);
    const profitColor = profit >= 0 ? '#4caf50' : '#f44336';
    
    return (
      <Animated.View 
        style={[
          styles.saleCard,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            setSelectedSale(item);
            setShowDetailModal(true);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.saleHeader}>
            <View style={styles.saleHeaderLeft}>
              <View style={styles.saleIdBadge}>
                <Text style={styles.saleIdText}>#{item.id.slice(-6)}</Text>
              </View>
              <Text style={styles.saleDate}>{formatDate(item.timestamp)}</Text>
            </View>
            <Text style={styles.saleTotal}>${item.total?.toFixed(2) || '0.00'}</Text>
          </View>
          
          <View style={styles.saleFooter}>
            <View style={styles.saleStats}>
              <Icon name="shopping-bag" size={16} color="#152d2a" />
              <Text style={styles.saleItems}>
                {item.items?.length || 0} items
              </Text>
            </View>
            
            <View style={styles.saleProfitBadge}>
              <Icon name="attach-money" size={14} color={profitColor} />
              <Text style={[styles.saleProfitText, { color: profitColor }]}>
                ${profit.toFixed(2)}
              </Text>
              <Text style={[styles.saleMarginText, { color: profitColor }]}>
                ({margin.toFixed(1)}%)
              </Text>
            </View>
            
            <View style={styles.saleStatusBadge}>
              <Icon name="check-circle" size={14} color="#4CAF50" />
              <Text style={styles.saleStatusText}>Completed</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Detail Modal Component
  const DetailModal = () => {
    const saleProfit = calculateSaleProfit(selectedSale || {});
    
    return (
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Order Details</Text>
                <Text style={styles.modalSubtitle}>
                  #{selectedSale?.id.slice(-8)}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowDetailModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color="#90a5a0" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSummary}>
              <View style={styles.modalSummaryItem}>
                <Text style={styles.modalSummaryLabel}>Date</Text>
                <Text style={styles.modalSummaryValue}>
                  {formatDate(selectedSale?.timestamp)}
                </Text>
              </View>
              <View style={styles.modalSummaryItem}>
                <Text style={styles.modalSummaryLabel}>Total</Text>
                <Text style={[styles.modalSummaryValue, styles.modalTotalValue]}>
                  ${selectedSale?.total?.toFixed(2) || '0.00'}
                </Text>
              </View>
              <View style={styles.modalSummaryItem}>
                <Text style={styles.modalSummaryLabel}>Items</Text>
                <Text style={styles.modalSummaryValue}>
                  {selectedSale?.items?.length || 0}
                </Text>
              </View>
            </View>

            {/* Profit Summary */}
            <View style={styles.modalProfitSummary}>
              <View style={styles.modalProfitItem}>
                <Text style={styles.modalProfitLabel}>Cost</Text>
                <Text style={styles.modalProfitValue}>${saleProfit.cost.toFixed(2)}</Text>
              </View>
              <View style={styles.modalProfitDivider} />
              <View style={styles.modalProfitItem}>
                <Text style={styles.modalProfitLabel}>Profit</Text>
                <Text style={[
                  styles.modalProfitValue,
                  { color: saleProfit.profit >= 0 ? '#4caf50' : '#f44336' }
                ]}>
                  ${saleProfit.profit.toFixed(2)}
                </Text>
              </View>
              <View style={styles.modalProfitDivider} />
              <View style={styles.modalProfitItem}>
                <Text style={styles.modalProfitLabel}>Margin</Text>
                <Text style={[
                  styles.modalProfitValue,
                  { color: saleProfit.profit >= 0 ? '#4caf50' : '#f44336' }
                ]}>
                  {saleProfit.margin.toFixed(1)}%
                </Text>
              </View>
            </View>

            <View style={styles.modalDivider} />

            <ScrollView style={styles.modalItemsList} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalItemsTitle}>Items Purchased</Text>
              {selectedSale?.items?.map((product, index) => {
                const quantity = product.quantity || 1;
                const purchasePrice = product.purchasePrice || 0;
                const sellingPrice = product.price || 0;
                const itemProfit = (sellingPrice - purchasePrice) * quantity;
                
                return (
                  <View key={index} style={styles.modalItem}>
                    <View style={styles.modalItemLeft}>
                      <View style={styles.modalItemQuantityBadge}>
                        <Text style={styles.modalItemQuantityText}>
                          {quantity}
                        </Text>
                      </View>
                      <View style={styles.modalItemInfo}>
                        <Text style={styles.modalItemName}>{product.name || 'Unknown'}</Text>
                        <View style={styles.modalItemPriceRow}>
                          <Text style={styles.modalItemPrice}>
                            Cost: ${purchasePrice.toFixed(2)}
                          </Text>
                          <Text style={styles.modalItemPrice}>
                            Sell: ${sellingPrice.toFixed(2)}
                          </Text>
                          <Text style={[
                            styles.modalItemProfit,
                            { color: itemProfit >= 0 ? '#4caf50' : '#f44336' }
                          ]}>
                            ${itemProfit.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.modalItemTotal}>
                      ${(sellingPrice * quantity).toFixed(2)}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseAction}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={styles.modalCloseActionText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const filteredSales = getFilteredSales();
  const stats = getFilteredStats();
  const overallProfitColor = stats.profit >= 0 ? '#4caf50' : '#f44336';

  if (loading && sales.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Loading sales history...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sales History</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 500);
          }}
        >
          <Icon name="refresh" size={22} color="#178556" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards with Profit */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Icon name="receipt" size={24} color="#178556" />
          <Text style={styles.summaryLabel}>Total Sales</Text>
          <Text style={styles.summaryValue}>{stats.count}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCard}>
          <Icon name="attach-money" size={24} color="#178556" />
          <Text style={styles.summaryLabel}>Revenue</Text>
          <Text style={styles.summaryValue}>${stats.revenue.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCard}>
          <Icon name="shopping-cart" size={24} color="#178556" />
          <Text style={styles.summaryLabel}>Items Sold</Text>
          <Text style={styles.summaryValue}>{stats.items}</Text>
        </View>
      </View>

      {/* Profit Summary Row */}
      <View style={styles.profitSummaryContainer}>
        <View style={styles.profitSummaryCard}>
          <View style={styles.profitSummaryLeft}>
            <Icon name="money-off" size={20} color="#FF9800" />
            <Text style={styles.profitSummaryLabel}>Total Cost</Text>
          </View>
          <Text style={styles.profitSummaryValue}>${stats.cost.toFixed(2)}</Text>
        </View>
        <View style={styles.profitSummaryDivider} />
        <View style={styles.profitSummaryCard}>
          <View style={styles.profitSummaryLeft}>
            <Icon name="attach-money" size={20} color={overallProfitColor} />
            <Text style={styles.profitSummaryLabel}>Total Profit</Text>
          </View>
          <Text style={[styles.profitSummaryValue, { color: overallProfitColor }]}>
            ${stats.profit.toFixed(2)}
          </Text>
        </View>
        <View style={styles.profitSummaryDivider} />
        <View style={styles.profitSummaryCard}>
          <View style={styles.profitSummaryLeft}>
            <Icon name="trending-up" size={20} color={overallProfitColor} />
            <Text style={styles.profitSummaryLabel}>Avg Margin</Text>
          </View>
          <Text style={[styles.profitSummaryValue, { color: overallProfitColor }]}>
            {stats.avgMargin.toFixed(1)}%
          </Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {['all', 'today', 'week', 'month'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.filterButton,
                filterPeriod === period && styles.filterButtonActive
              ]}
              onPress={() => setFilterPeriod(period)}
            >
              <Text style={[
                styles.filterText,
                filterPeriod === period && styles.filterTextActive
              ]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredSales}
        renderItem={renderSale}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="receipt" size={60} color="#90a5a0" />
            <Text style={styles.emptyTitle}>No Sales Recorded</Text>
            <Text style={styles.emptySubtitle}>
              {filterPeriod !== 'all' 
                ? `No sales in the ${filterPeriod} period` 
                : 'Sales will appear here once you process checkout'}
            </Text>
          </View>
        }
      />

      <DetailModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#152d2a',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#178556',
    borderTopColor: 'transparent',
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#90a5a0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#90a5a0',
    borderBottomWidth: 1,
    borderBottomColor: '#178556',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#152d2a',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#152d2a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#178556',
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#90a5a0',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#178556',
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#152d2a',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#152d2a',
    marginTop: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#152d2a',
    marginTop: 2,
  },
  profitSummaryContainer: {
    flexDirection: 'row',
    backgroundColor: '#152d2a',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#178556',
  },
  profitSummaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  profitSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profitSummaryDivider: {
    width: 1,
    backgroundColor: '#178556',
  },
  profitSummaryLabel: {
    fontSize: 11,
    color: '#90a5a0',
    marginLeft: 4,
  },
  profitSummaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#90a5a0',
  },
  filterContainer: {
    backgroundColor: '#90a5a0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#178556',
  },
  filterScrollContent: {
    paddingRight: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#152d2a',
  },
  filterButtonActive: {
    backgroundColor: '#178556',
  },
  filterText: {
    fontSize: 13,
    color: '#90a5a0',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  list: {
    padding: 12,
  },
  saleCard: {
    backgroundColor: '#90a5a0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#178556',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  saleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleIdBadge: {
    backgroundColor: '#152d2a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  saleIdText: {
    fontSize: 11,
    color: '#90a5a0',
    fontWeight: '600',
  },
  saleDate: {
    fontSize: 13,
    color: '#152d2a',
  },
  saleTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#152d2a',
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#152d2a',
  },
  saleStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleItems: {
    fontSize: 13,
    color: '#152d2a',
    marginLeft: 4,
  },
  saleProfitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#152d2a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  saleProfitText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  saleMarginText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 2,
  },
  saleStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#152d2a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  saleStatusText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#90a5a0',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#178556',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#152d2a',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#152d2a',
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSummary: {
    flexDirection: 'row',
    backgroundColor: '#152d2a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  modalSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  modalSummaryLabel: {
    fontSize: 11,
    color: '#90a5a0',
  },
  modalSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#90a5a0',
    marginTop: 2,
  },
  modalTotalValue: {
    color: '#178556',
    fontSize: 16,
  },
  modalProfitSummary: {
    flexDirection: 'row',
    backgroundColor: '#152d2a',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#178556',
  },
  modalProfitItem: {
    flex: 1,
    alignItems: 'center',
  },
  modalProfitDivider: {
    width: 1,
    backgroundColor: '#178556',
  },
  modalProfitLabel: {
    fontSize: 10,
    color: '#90a5a0',
  },
  modalProfitValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#90a5a0',
    marginTop: 2,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#152d2a',
    marginBottom: 12,
  },
  modalItemsList: {
    maxHeight: 300,
  },
  modalItemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#152d2a',
    marginBottom: 8,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#152d2a',
  },
  modalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalItemQuantityBadge: {
    backgroundColor: '#152d2a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
    minWidth: 28,
    alignItems: 'center',
  },
  modalItemQuantityText: {
    color: '#178556',
    fontWeight: '700',
    fontSize: 12,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 14,
    color: '#152d2a',
    fontWeight: '500',
  },
  modalItemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  modalItemPrice: {
    fontSize: 11,
    color: '#152d2a',
    marginRight: 8,
  },
  modalItemProfit: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#178556',
  },
  modalCloseAction: {
    backgroundColor: '#152d2a',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  modalCloseActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#90a5a0',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#90a5a0',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#90a5a0',
    marginTop: 4,
    textAlign: 'center',
  },
});