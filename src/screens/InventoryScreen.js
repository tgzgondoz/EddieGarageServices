import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { database } from '../config/firebase';
import { ref, onValue, off, set, update, remove } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function InventoryScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up real-time listener
    const productsRef = ref(database, 'products');
    
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productsData = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setProducts(productsData);
      } else {
        setProducts([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to fetch products');
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => off(productsRef);
  }, []);

  // Refresh products when screen comes into focus
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      // The onValue listener will automatically update data
      // No need to manually fetch
    });
    return unsubscribeFocus;
  }, [navigation]);

  const updateStock = async (productId, currentStock, change) => {
    const newStock = currentStock + change;
    if (newStock < 0) {
      Alert.alert('Error', 'Stock cannot be negative');
      return;
    }

    try {
      const productRef = ref(database, `products/${productId}`);
      await update(productRef, { quantity: newStock });
      // The real-time listener will automatically update the UI
    } catch (error) {
      console.error('Error updating stock:', error);
      Alert.alert('Error', 'Failed to update stock');
    }
  };

  const deleteProduct = async (productId) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const productRef = ref(database, `products/${productId}`);
              await remove(productRef);
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          }
        }
      ]
    );
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const matchesStock = lowStockOnly ? (product.quantity || 0) <= 10 : true;
    return matchesSearch && matchesStock;
  });

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name || 'Unnamed Product'}</Text>
        <Text style={styles.productSku}>SKU: {item.sku || 'N/A'}</Text>
        <Text style={styles.productPrice}>
          ${item.price?.toFixed(2) || '0.00'}
        </Text>
        <Text style={[
          styles.productStock,
          (item.quantity || 0) <= 10 && styles.lowStock
        ]}>
          Stock: {item.quantity || 0}
        </Text>
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddEditProduct', { product: item })}
        >
          <Icon name="edit" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => deleteProduct(item.id)}
        >
          <Icon name="delete" size={24} color="#f44336" />
        </TouchableOpacity>
        <View style={styles.stockControls}>
          <TouchableOpacity 
            onPress={() => updateStock(item.id, item.quantity || 0, -1)}
            disabled={loading}
          >
            <Icon name="remove-circle-outline" size={28} color="#ff6b00" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => updateStock(item.id, item.quantity || 0, 1)}
            disabled={loading}
          >
            <Icon name="add-circle-outline" size={28} color="#ff6b00" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading && products.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={[styles.filterButton, lowStockOnly && styles.filterButtonActive]}
          onPress={() => setLowStockOnly(!lowStockOnly)}
        >
          <Icon name="warning" size={20} color={lowStockOnly ? '#fff' : '#ff6b00'} />
          <Text style={[styles.filterText, lowStockOnly && styles.filterTextActive]}>
            Low Stock
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No products found' : 'No products available'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEditProduct')}
      >
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
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
  },
  header: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'white',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff6b00',
  },
  filterButtonActive: {
    backgroundColor: '#ff6b00',
  },
  filterText: {
    marginLeft: 5,
    color: '#ff6b00',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: 10,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productSku: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  productPrice: {
    fontSize: 14,
    color: '#ff6b00',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  productStock: {
    fontSize: 12,
    color: '#666',
  },
  lowStock: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginHorizontal: 5,
  },
  stockControls: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#ff6b00',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});