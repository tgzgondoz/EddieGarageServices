import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductService from '../services/ProductService';

const { width, height } = Dimensions.get('window');

const ProductListScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    ProductService.getProducts((productsList) => {
      setProducts(productsList);
      filterProducts(productsList, searchQuery, selectedCategory);
      setLoading(false);
      setRefreshing(false);
    });
  };

  const filterProducts = (productsList, query, category) => {
    let filtered = [...productsList];
    
    if (query) {
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query.toLowerCase()) ||
        p.sku?.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    if (category !== 'All') {
      filtered = filtered.filter(p => p.category === category);
    }
    
    setFilteredProducts(filtered);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    filterProducts(products, text, selectedCategory);
  };

  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    filterProducts(products, searchQuery, category);
  };

  const handleDeleteProduct = (productId, productName) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${productName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProductService.deleteProduct(productId);
              Alert.alert('Success', 'Product deleted successfully');
              loadProducts();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const handleRestock = (product) => {
    Alert.prompt(
      'Restock Product',
      `Enter quantity to add to ${product.name}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restock',
          onPress: async (quantity) => {
            if (quantity && !isNaN(quantity) && parseInt(quantity) > 0) {
              try {
                await ProductService.updateInventory(product.id, parseInt(quantity), 'restock');
                Alert.alert('Success', 'Inventory updated successfully');
                loadProducts();
              } catch (error) {
                Alert.alert('Error', 'Failed to update inventory');
              }
            } else {
              Alert.alert('Error', 'Please enter a valid quantity');
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const getStockStatus = (quantity) => {
    if (quantity <= 0) return { label: 'Out of Stock', color: '#EF4444' };
    if (quantity < 10) return { label: 'Low Stock', color: '#F59E0B' };
    if (quantity < 50) return { label: 'In Stock', color: '#000f3f' };
    return { label: 'Well Stocked', color: '#059669' };
  };

  const formatCurrency = (amount) => {
    return `$${amount?.toFixed(2) || '0.00'}`;
  };

  const renderProduct = ({ item }) => {
    const status = getStockStatus(item.quantity);
    const profit = (item.sellPrice || 0) - (item.buyPrice || 0);
    const description = item.sku || 'No description';
    
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetails', { product: item })}
        activeOpacity={0.7}
      >
        <View style={styles.productHeader}>
          <View style={styles.productTitleContainer}>
            <View style={styles.productIconContainer}>
              <Icon name="cube-outline" size={18} color="#000f3f" />
            </View>
            <Text style={styles.productName}>{item.name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>
        
        <View style={styles.productDescriptionContainer}>
          <Icon name="document-text-outline" size={12} color="#6B7280" />
          <Text style={styles.productDescription} numberOfLines={1}>
            {description}
          </Text>
        </View>
        
        <View style={styles.productDetails}>
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Selling Price</Text>
            <Text style={styles.price}>{formatCurrency(item.sellPrice)}</Text>
            <View style={styles.costContainer}>
              <Icon name="cart-outline" size={12} color="#6B7280" />
              <Text style={styles.costText}>Cost: {formatCurrency(item.buyPrice)}</Text>
            </View>
          </View>
          
          <View style={styles.rightDetails}>
            <Text style={styles.quantityLabel}>Stock</Text>
            <Text style={styles.quantity}>{item.quantity || 0}</Text>
            <View style={styles.profitContainer}>
              <Icon name="trending-up" size={12} color="#10B981" />
              <Text style={styles.profitText}>+{formatCurrency(profit)}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.restockButton]}
            onPress={() => handleRestock(item)}
          >
            <Icon name="add-circle-outline" size={16} color="#FFFFFF" />
            <Text style={styles.restockButtonText}>Restock</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteProduct(item.id, item.name)}
          >
            <Icon name="trash-outline" size={16} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  // Fixed Header Component
  const FixedHeader = () => (
    <View style={[styles.fixedHeaderContainer, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Products</Text>
          <Text style={styles.headerSubtitle}>
            {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} available
          </Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={loadProducts}>
          <Icon name="refresh-outline" size={22} color="#000f3f" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search-outline" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Icon name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.categorySection}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive
              ]}
              onPress={() => handleCategoryFilter(category)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive
              ]}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
        <ActivityIndicator size="large" color="#000f3f" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <FixedHeader />
      
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={loadProducts}
            colors={['#000f3f']}
            tintColor="#000f3f"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="cube-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search or filters' : 'Tap + to add your first product'}
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: 80 + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
        style={styles.flatList}
      />
      
      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => navigation.navigate('AddProduct')}
        activeOpacity={0.8}
      >
        <Icon name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  fixedHeaderContainer: {
    backgroundColor: '#F3F4F6',
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  flatList: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000f3f15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000f3f30',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#111827',
  },
  categorySection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryScroll: {
    paddingVertical: 6,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#000f3f',
    borderColor: '#000f3f',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  productTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000f3f15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  productDescriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    paddingLeft: 36,
  },
  productDescription: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 36,
    marginBottom: 12,
  },
  priceSection: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 1,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000f3f',
  },
  costContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  costText: {
    fontSize: 11,
    color: '#6B7280',
  },
  rightDetails: {
    alignItems: 'flex-end',
  },
  quantityLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 1,
  },
  quantity: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000f3f',
  },
  profitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  profitText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingLeft: 36,
  },
  actionButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  restockButton: {
    backgroundColor: '#000f3f',
  },
  restockButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000f3f',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000f3f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 6,
  },
});

export default ProductListScreen;