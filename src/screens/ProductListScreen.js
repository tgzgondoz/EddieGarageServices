import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Dimensions,
  SafeAreaView,
  Animated,
} from 'react-native';
import { database } from '../config/firebase';
import { ref, onValue, off } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function ProductListScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const productsRef = ref(database, 'products');
    
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productsData = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setProducts(productsData);
        
        // Extract unique categories
        const cats = new Set(['All']);
        productsData.forEach(product => {
          if (product.category && product.category.trim() !== '') {
            if (typeof product.category === 'object') {
              const categoryName = product.category.name || product.category.value || String(product.category);
              if (categoryName && categoryName.trim() !== '') {
                cats.add(categoryName.trim());
              }
            } else {
              const categoryName = String(product.category).trim();
              if (categoryName !== '') {
                cats.add(categoryName);
              }
            }
          }
        });
        setCategories(Array.from(cats));
      } else {
        setProducts([]);
        setCategories(['All']);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching products:', error);
      setLoading(false);
    });

    return () => off(productsRef);
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const getProductCategory = (product) => {
    if (!product.category) return '';
    if (typeof product.category === 'object') {
      return product.category.name || product.category.value || String(product.category);
    }
    return String(product.category);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const productCategory = getProductCategory(product);
    const matchesCategory = selectedCategory === 'All' || productCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderGridItem = ({ item }) => (
    <Animated.View style={[styles.gridCard, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={styles.gridTouchable}
        onPress={() => navigation.navigate('ProductDetails', { product: item })}
      >
        <View style={styles.gridImageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.gridImage} />
          ) : (
            <View style={styles.gridImagePlaceholder}>
              <Icon name="inventory-2" size={40} color="#ccc" />
            </View>
          )}
          {(item.quantity || 0) <= 5 && (item.quantity || 0) > 0 && (
            <View style={styles.lowStockBadge}>
              <Text style={styles.lowStockBadgeText}>Low Stock</Text>
            </View>
          )}
          {(item.quantity || 0) === 0 && (
            <View style={styles.outOfStockBadge}>
              <Text style={styles.outOfStockBadgeText}>Out of Stock</Text>
            </View>
          )}
        </View>
        <View style={styles.gridInfo}>
          <Text style={styles.gridName} numberOfLines={1}>{item.name || 'Unnamed'}</Text>
          <Text style={styles.gridPrice}>${item.price?.toFixed(2) || '0.00'}</Text>
          <View style={styles.gridStockRow}>
            <Icon name="inventory" size={14} color="#888" />
            <Text style={styles.gridStock}>{item.quantity || 0} in stock</Text>
          </View>
          {item.category && (
            <View style={styles.gridCategoryBadge}>
              <Text style={styles.gridCategoryText}>{getProductCategory(item)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderListItem = ({ item }) => (
    <Animated.View style={[styles.listCard, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={styles.listTouchable}
        onPress={() => navigation.navigate('ProductDetails', { product: item })}
      >
        <View style={styles.listImageContainer}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.listImage} />
          ) : (
            <View style={styles.listImagePlaceholder}>
              <Icon name="inventory-2" size={30} color="#ccc" />
            </View>
          )}
        </View>
        <View style={styles.listInfo}>
          <View style={styles.listHeader}>
            <Text style={styles.listName} numberOfLines={1}>{item.name || 'Unnamed'}</Text>
            <Text style={styles.listPrice}>${item.price?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.listDetails}>
            <View style={styles.listStockRow}>
              <Icon name="inventory" size={14} color="#888" />
              <Text style={[
                styles.listStock,
                (item.quantity || 0) <= 5 && styles.lowStockText
              ]}>
                {item.quantity || 0} in stock
              </Text>
            </View>
            {item.category && (
              <View style={styles.listCategoryBadge}>
                <Text style={styles.listCategoryText}>{getProductCategory(item)}</Text>
              </View>
            )}
          </View>
        </View>
        <Icon name="chevron-right" size={20} color="#ccc" />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderProduct = viewMode === 'grid' ? renderGridItem : renderListItem;

  if (loading && products.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Icon name="close" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.viewToggle}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          <Icon 
            name={viewMode === 'grid' ? 'view-list' : 'grid-view'} 
            size={24} 
            color="#ff6b00" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.categoryContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive
              ]}>
                {category}
              </Text>
              {selectedCategory === category && (
                <View style={styles.categoryActiveIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.resultCount}>
          <Text style={styles.resultCountText}>{filteredProducts.length} items</Text>
        </View>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        key={viewMode} // Force re-render when view mode changes
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : null}
        contentContainerStyle={[
          styles.list,
          viewMode === 'grid' ? styles.gridList : styles.listList
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="search-off" size={60} color="#ddd" />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search' : 'No products available'}
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
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  viewToggle: {
    padding: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryScrollContent: {
    paddingRight: 8,
    flex: 1,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  categoryButtonActive: {
    backgroundColor: '#ff6b00',
  },
  categoryText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  categoryActiveIndicator: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff6b00',
  },
  resultCount: {
    marginLeft: 'auto',
    paddingLeft: 8,
  },
  resultCountText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  list: {
    padding: 12,
  },
  gridList: {
    paddingBottom: 20,
  },
  listList: {
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  // Grid View Styles
  gridCard: {
    flex: 1,
    margin: 4,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
    maxWidth: (width - 40) / 2,
  },
  gridTouchable: {
    flex: 1,
  },
  gridImageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#f8f9fa',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  lowStockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lowStockBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#f44336',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outOfStockBadgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  gridInfo: {
    padding: 10,
  },
  gridName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  gridPrice: {
    fontSize: 16,
    color: '#ff6b00',
    fontWeight: '700',
    marginBottom: 2,
  },
  gridStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  gridStock: {
    fontSize: 11,
    color: '#888',
    marginLeft: 4,
  },
  gridCategoryBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  gridCategoryText: {
    fontSize: 10,
    color: '#666',
  },
  // List View Styles
  listCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  listTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  listImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  listImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  listImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  listInfo: {
    flex: 1,
    marginLeft: 12,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 8,
  },
  listPrice: {
    fontSize: 15,
    color: '#ff6b00',
    fontWeight: '700',
  },
  listDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listStock: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
  lowStockText: {
    color: '#ff9800',
    fontWeight: '600',
  },
  listCategoryBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  listCategoryText: {
    fontSize: 11,
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
    color: '#333',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
});