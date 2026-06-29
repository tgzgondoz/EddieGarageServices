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
  const [totalItems, setTotalItems] = useState(0);
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
        let items = 0;
        salesData.forEach(sale => {
          revenue += sale.total || 0;
          items += sale.items?.length || 0;
        });
        
        setSales(salesData);
        setTotalRevenue(revenue);
        setTotalItems(items);
      } else {
        setSales([]);
        setTotalRevenue(0);
        setTotalItems(0);
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
    let items = 0;
    filtered.forEach(sale => {
      revenue += sale.total || 0;
      items += sale.items?.length || 0;
    });
    return { revenue, items, count: filtered.length };
  };

  const renderSale = ({ item, index }) => (
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
            <Icon name="shopping-bag" size={16} color="#888" />
            <Text style={styles.saleItems}>
              {item.items?.length || 0} items
            </Text>
          </View>
          <View style={styles.saleStatusBadge}>
            <Icon name="check-circle" size={14} color="#4caf50" />
            <Text style={styles.saleStatusText}>Completed</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // Detail Modal Component
  const DetailModal = () => (
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
              <Icon name="close" size={24} color="#666" />
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

          <View style={styles.modalDivider} />

          <ScrollView style={styles.modalItemsList} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalItemsTitle}>Items Purchased</Text>
            {selectedSale?.items?.map((product, index) => (
              <View key={index} style={styles.modalItem}>
                <View style={styles.modalItemLeft}>
                  <View style={styles.modalItemQuantityBadge}>
                    <Text style={styles.modalItemQuantityText}>
                      {product.quantity || 0}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.modalItemName}>{product.name || 'Unknown'}</Text>
                    <Text style={styles.modalItemPrice}>${product.price?.toFixed(2) || '0.00'} each</Text>
                  </View>
                </View>
                <Text style={styles.modalItemTotal}>
                  ${((product.price || 0) * (product.quantity || 0)).toFixed(2)}
                </Text>
              </View>
            ))}
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

  const filteredSales = getFilteredSales();
  const stats = getFilteredStats();

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
            // Force refresh by re-subscribing
            setLoading(true);
            setTimeout(() => setLoading(false), 500);
          }}
        >
          <Icon name="refresh" size={22} color="#ff6b00" />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Icon name="receipt" size={24} color="#ff6b00" />
          <Text style={styles.summaryLabel}>Total Sales</Text>
          <Text style={styles.summaryValue}>{stats.count}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCard}>
          <Icon name="attach-money" size={24} color="#ff6b00" />
          <Text style={styles.summaryLabel}>Revenue</Text>
          <Text style={styles.summaryValue}>${stats.revenue.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCard}>
          <Icon name="shopping-cart" size={24} color="#ff6b00" />
          <Text style={styles.summaryLabel}>Items Sold</Text>
          <Text style={styles.summaryValue}>{stats.items}</Text>
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
            <Icon name="receipt" size={60} color="#ddd" />
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
    backgroundColor: '#f5f5f5',
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
    borderColor: '#ff6b00',
    borderTopColor: 'transparent',
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 10,
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginTop: 2,
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterScrollContent: {
    paddingRight: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  filterButtonActive: {
    backgroundColor: '#ff6b00',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
  },
  list: {
    padding: 12,
  },
  saleCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
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
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  saleIdText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  saleDate: {
    fontSize: 13,
    color: '#888',
  },
  saleTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff6b00',
  },
  saleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  saleStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleItems: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  saleStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  saleStatusText: {
    fontSize: 11,
    color: '#4caf50',
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
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
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
    color: '#1a1a2e',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSummary: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  modalSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  modalSummaryLabel: {
    fontSize: 11,
    color: '#888',
  },
  modalSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginTop: 2,
  },
  modalTotalValue: {
    color: '#ff6b00',
    fontSize: 16,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  modalItemsList: {
    maxHeight: 300,
  },
  modalItemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  modalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalItemQuantityBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 10,
    minWidth: 28,
    alignItems: 'center',
  },
  modalItemQuantityText: {
    color: '#ff6b00',
    fontWeight: '700',
    fontSize: 12,
  },
  modalItemName: {
    fontSize: 14,
    color: '#333',
  },
  modalItemPrice: {
    fontSize: 12,
    color: '#888',
  },
  modalItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b00',
  },
  modalCloseAction: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
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
    color: '#666',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});