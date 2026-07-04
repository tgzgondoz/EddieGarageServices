// screens/ProductProfitScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { database } from '../config/firebase';
import { ref, onValue, off } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function ProductProfitScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('profit'); // 'profit', 'margin', 'sales'

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = () => {
    const productsRef = ref(database, 'products');
    
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productsData = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setProducts(productsData);
        filterAndSortProducts(productsData, searchQuery, sortBy);
      } else {
        setProducts([]);
        setFilteredProducts([]);
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

  const filterAndSortProducts = (data, query, sort) => {
    let filtered = data.filter(product => {
      const name = product.name?.toLowerCase() || '';
      const sku = product.sku?.toLowerCase() || '';
      const search = query.toLowerCase();
      return name.includes(search) || sku.includes(search);
    });

    // Sort products
    switch(sort) {
      case 'profit':
        filtered.sort((a, b) => ((b.sellingPrice || 0) - (b.purchasePrice || 0)) - ((a.sellingPrice || 0) - (a.purchasePrice || 0)));
        break;
      case 'margin':
        filtered.sort((a, b) => {
          const marginA = a.sellingPrice > 0 ? ((a.sellingPrice - a.purchasePrice) / a.sellingPrice) * 100 : 0;
          const marginB = b.sellingPrice > 0 ? ((b.sellingPrice - b.purchasePrice) / b.sellingPrice) * 100 : 0;
          return marginB - marginA;
        });
        break;
      case 'sales':
        filtered.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    filterAndSortProducts(products, query, sortBy);
  };

  const handleSort = (sort) => {
    setSortBy(sort);
    filterAndSortProducts(products, searchQuery, sort);
  };

  const getProfitColor = (profit) => {
    if (profit > 0) return '#4caf50';
    if (profit < 0) return '#f44336';
    return '#FF9800';
  };

  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };

  const renderItem = ({ item }) => {
    const profit = (item.sellingPrice || 0) - (item.purchasePrice || 0);
    const margin = item.sellingPrice > 0 ? (profit / item.sellingPrice) * 100 : 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetails', { product: item })}
      >
        <View style={styles.productHeader}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name || 'Unnamed'}
          </Text>
          <Text style={styles.productSku}>SKU: {item.sku || 'N/A'}</Text>
        </View>
        
        <View style={styles.productStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Purchase</Text>
            <Text style={styles.statValue}>{formatCurrency(item.purchasePrice || 0)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Selling</Text>
            <Text style={styles.statValue}>{formatCurrency(item.sellingPrice || 0)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Profit</Text>
            <Text style={[styles.statValue, { color: getProfitColor(profit) }]}>
              {formatCurrency(profit)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Margin</Text>
            <Text style={[styles.statValue, { color: getProfitColor(profit) }]}>
              {margin.toFixed(1)}%
            </Text>
          </View>
        </View>
        
        <View style={styles.productFooter}>
          <View style={styles.stockBadge}>
            <Icon name="inventory" size={14} color="#90a5a0" />
            <Text style={styles.stockText}>Stock: {item.quantity || 0}</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#152d2a" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#178556" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Profit</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Icon name="refresh" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#90a5a0" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#90a5a0"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
            <Icon name="close" size={18} color="#90a5a0" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sort Buttons */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'profit' && styles.sortButtonActive]}
          onPress={() => handleSort('profit')}
        >
          <Icon name="attach-money" size={14} color={sortBy === 'profit' ? '#FFF' : '#152d2a'} />
          <Text style={[styles.sortButtonText, sortBy === 'profit' && styles.sortButtonTextActive]}>
            Profit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'margin' && styles.sortButtonActive]}
          onPress={() => handleSort('margin')}
        >
          <Icon name="percent" size={14} color={sortBy === 'margin' ? '#FFF' : '#152d2a'} />
          <Text style={[styles.sortButtonText, sortBy === 'margin' && styles.sortButtonTextActive]}>
            Margin
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'sales' && styles.sortButtonActive]}
          onPress={() => handleSort('sales')}
        >
          <Icon name="trending-up" size={14} color={sortBy === 'sales' ? '#FFF' : '#152d2a'} />
          <Text style={[styles.sortButtonText, sortBy === 'sales' && styles.sortButtonTextActive]}>
            Sales
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#178556" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="inventory-2" size={60} color="#90a5a0" />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search' : 'Add products to see profit analytics'}
            </Text>
          </View>
        }
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#90a5a0',
    borderRadius: 10,
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#178556',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#152d2a',
  },
  clearButton: {
    padding: 4,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
  },
  sortLabel: {
    fontSize: 13,
    color: '#90a5a0',
    marginRight: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#90a5a0',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#178556',
  },
  sortButtonActive: {
    backgroundColor: '#178556',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#152d2a',
    fontWeight: '500',
    marginLeft: 4,
  },
  sortButtonTextActive: {
    color: '#FFF',
  },
  list: {
    padding: 12,
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: '#90a5a0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#178556',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#152d2a',
    flex: 1,
  },
  productSku: {
    fontSize: 11,
    color: '#152d2a',
    marginLeft: 8,
  },
  productStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: '#152d2a',
    padding: 8,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#90a5a0',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#152d2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 11,
    color: '#90a5a0',
    marginLeft: 4,
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