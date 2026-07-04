// screens/ProfitAnalyticsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { database } from '../config/firebase';
import { ref, onValue, off } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function ProfitAnalyticsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [avgProfitMargin, setAvgProfitMargin] = useState(0);
  const [bestSellingProducts, setBestSellingProducts] = useState([]);
  const [mostProfitableProducts, setMostProfitableProducts] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    const productsRef = ref(database, 'products');
    
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productsData = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        
        setProducts(productsData);
        calculateAnalytics(productsData);
      } else {
        setProducts([]);
        resetAnalytics();
      }
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Error fetching products:', error);
      setLoading(false);
      setRefreshing(false);
    });

    return () => off(productsRef);
  };

  const calculateAnalytics = (productsData) => {
    let totalCost = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    let profitMarginSum = 0;
    let marginCount = 0;

    const productProfitData = productsData.map(product => {
      const cost = product.purchasePrice || 0;
      const revenue = product.sellingPrice || 0;
      const profit = revenue - cost;
      const quantity = product.quantity || 0;
      const totalProductCost = cost * quantity;
      const totalProductRevenue = revenue * quantity;
      const totalProductProfit = profit * quantity;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      totalCost += totalProductCost;
      totalRevenue += totalProductRevenue;
      totalProfit += totalProductProfit;

      if (revenue > 0) {
        profitMarginSum += margin;
        marginCount++;
      }

      return {
        ...product,
        profit,
        margin,
        totalProductCost,
        totalProductRevenue,
        totalProductProfit,
      };
    });

    setTotalCost(totalCost);
    setTotalRevenue(totalRevenue);
    setTotalProfit(totalProfit);
    setAvgProfitMargin(marginCount > 0 ? profitMarginSum / marginCount : 0);

    // Best selling products (by quantity)
    const sortedBySales = [...productProfitData].sort((a, b) => 
      (b.quantity || 0) - (a.quantity || 0)
    ).slice(0, 5);
    setBestSellingProducts(sortedBySales);

    // Most profitable products
    const sortedByProfit = [...productProfitData].sort((a, b) => 
      (b.totalProductProfit || 0) - (a.totalProductProfit || 0)
    ).slice(0, 5);
    setMostProfitableProducts(sortedByProfit);
  };

  const resetAnalytics = () => {
    setTotalCost(0);
    setTotalRevenue(0);
    setTotalProfit(0);
    setAvgProfitMargin(0);
    setBestSellingProducts([]);
    setMostProfitableProducts([]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };

  const getProfitColor = (profit) => {
    if (profit > 0) return '#4caf50';
    if (profit < 0) return '#f44336';
    return '#FF9800';
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#178556" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profit Analytics</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Icon name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#178556" />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Icon name="attach-money" size={24} color="#4caf50" />
            </View>
            <Text style={styles.summaryLabel}>Total Profit</Text>
            <Text style={[styles.summaryValue, { color: totalProfit >= 0 ? '#4caf50' : '#f44336' }]}>
              {formatCurrency(totalProfit)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Icon name="trending-up" size={24} color="#FF9800" />
            </View>
            <Text style={styles.summaryLabel}>Avg Margin</Text>
            <Text style={[styles.summaryValue, { color: avgProfitMargin >= 0 ? '#4caf50' : '#f44336' }]}>
              {avgProfitMargin.toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Icon name="shopping-cart" size={24} color="#178556" />
            </View>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Icon name="money-off" size={24} color="#f44336" />
            </View>
            <Text style={styles.summaryLabel}>Total Cost</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalCost)}</Text>
          </View>
        </View>

        {/* Best Selling Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Best Selling Products</Text>
          {bestSellingProducts.length > 0 ? (
            bestSellingProducts.map((product, index) => (
              <TouchableOpacity
                key={product.id}
                style={styles.listItem}
                onPress={() => navigation.navigate('ProductDetails', { product })}
              >
                <View style={styles.listItemRank}>
                  <Text style={styles.rankNumber}>#{index + 1}</Text>
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemName} numberOfLines={1}>
                    {product.name || 'Unnamed'}
                  </Text>
                  <Text style={styles.listItemDetail}>
                    {product.quantity || 0} units • {formatCurrency(product.totalProductProfit || 0)} profit
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color="#90a5a0" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No products available</Text>
            </View>
          )}
        </View>

        {/* Most Profitable Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Profitable Products</Text>
          {mostProfitableProducts.length > 0 ? (
            mostProfitableProducts.map((product, index) => (
              <TouchableOpacity
                key={product.id}
                style={styles.listItem}
                onPress={() => navigation.navigate('ProductDetails', { product })}
              >
                <View style={styles.listItemRank}>
                  <Text style={styles.rankNumber}>#{index + 1}</Text>
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemName} numberOfLines={1}>
                    {product.name || 'Unnamed'}
                  </Text>
                  <Text style={[
                    styles.listItemDetail,
                    { color: getProfitColor(product.totalProductProfit || 0) }
                  ]}>
                    {formatCurrency(product.totalProductProfit || 0)} profit • {product.margin?.toFixed(1) || 0}% margin
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color="#90a5a0" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No products available</Text>
            </View>
          )}
        </View>

        {/* View All Products Button */}
        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => navigation.navigate('ProductProfit')}
        >
          <Icon name="list-alt" size={20} color="#FFF" />
          <Text style={styles.viewAllButtonText}>View All Products Profit</Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  loadingText: {
    color: '#90a5a0',
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#152d2a',
    borderBottomWidth: 1,
    borderBottomColor: '#178556',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  refreshButton: {
    padding: 4,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#90a5a0',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#178556',
    alignItems: 'center',
  },
  summaryIconContainer: {
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#152d2a',
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#152d2a',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#90a5a0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#178556',
  },
  listItemRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#178556',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  listItemContent: {
    flex: 1,
  },
  listItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#152d2a',
  },
  listItemDetail: {
    fontSize: 12,
    color: '#152d2a',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#90a5a0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#178556',
  },
  emptyText: {
    color: '#152d2a',
    fontSize: 14,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#178556',
    marginHorizontal: 12,
    marginVertical: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#152d2a',
  },
  viewAllButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});