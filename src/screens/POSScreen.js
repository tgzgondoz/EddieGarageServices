import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { database } from '../config/firebase';
import { ref, onValue, off, update, push, set } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function POSScreen() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  useEffect(() => {
    // Set up real-time listener for products
    const productsRef = ref(database, 'products');
    
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productsData = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setProducts(productsData);
        
        // Extract unique categories from products
        const uniqueCategories = new Set();
        uniqueCategories.add('All');
        
        productsData.forEach(product => {
          // Handle category if it exists and is not null/undefined
          if (product.category && product.category.trim() !== '') {
            // If category is an object, try to get its name or value
            if (typeof product.category === 'object') {
              const categoryName = product.category.name || product.category.value || String(product.category);
              if (categoryName && categoryName.trim() !== '') {
                uniqueCategories.add(categoryName.trim());
              }
            } else {
              // If category is a string
              const categoryName = String(product.category).trim();
              if (categoryName !== '') {
                uniqueCategories.add(categoryName);
              }
            }
          }
        });
        
        setCategories(Array.from(uniqueCategories));
      } else {
        setProducts([]);
        setCategories(['All']);
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

  const addToCart = (product) => {
    if (product.quantity <= 0) {
      Alert.alert('Out of Stock', `${product.name} is out of stock!`);
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.cartQuantity + 1 > product.quantity) {
        Alert.alert('Limit Reached', `Only ${product.quantity} ${product.name} available!`);
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, cartQuantity: item.cartQuantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, cartQuantity: 1 }]);
    }
  };

  const updateCartQuantity = (productId, change) => {
    const item = cart.find(item => item.id === productId);
    const originalProduct = products.find(p => p.id === productId);

    if (change === -1 && item.cartQuantity === 1) {
      removeFromCart(productId);
    } else if (change === 1 && item.cartQuantity + 1 > originalProduct.quantity) {
      Alert.alert('Limit Reached', `Only ${originalProduct.quantity} items available!`);
    } else {
      setCart(cart.map(item =>
        item.id === productId
          ? { ...item, cartQuantity: item.cartQuantity + change }
          : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to cart first');
      return;
    }

    Alert.alert(
      'Confirm Checkout',
      `Total: $${getTotal().toFixed(2)}\nProceed with payment?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: processCheckout }
      ]
    );
  };

  const processCheckout = async () => {
    try {
      // Update inventory for each item in cart
      for (const item of cart) {
        const productRef = ref(database, `products/${item.id}`);
        const newQuantity = item.quantity - item.cartQuantity;
        await update(productRef, { quantity: newQuantity });
      }

      // Create sale record
      const sale = {
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.cartQuantity
        })),
        total: getTotal(),
        timestamp: new Date().toISOString(),
        status: 'completed'
      };

      // Save sale to database
      const salesRef = ref(database, 'sales');
      const newSaleRef = push(salesRef);
      await set(newSaleRef, sale);

      Alert.alert('Success', 'Checkout completed successfully!');
      setCart([]);
      // The real-time listener will automatically update the products
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Error', 'Failed to process checkout');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  // Helper function to get product category safely
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
    return matchesSearch && matchesCategory && (product.quantity || 0) > 0;
  });

  const renderProductItem = ({ item }) => (
    <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
      <View style={styles.productImagePlaceholder}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.productImage} />
        ) : (
          <Icon name="inventory-2" size={40} color="#ccc" />
        )}
      </View>
      <Text style={styles.productName} numberOfLines={1}>{item.name || 'Unnamed'}</Text>
      <Text style={styles.productPrice}>${item.price?.toFixed(2) || '0.00'}</Text>
      <Text style={styles.productStock}>Stock: {item.quantity || 0}</Text>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>${item.price.toFixed(2)}</Text>
      </View>
      <View style={styles.cartItemActions}>
        <TouchableOpacity onPress={() => updateCartQuantity(item.id, -1)}>
          <Icon name="remove-circle-outline" size={28} color="#ff6b00" />
        </TouchableOpacity>
        <Text style={styles.cartItemQuantity}>{item.cartQuantity}</Text>
        <TouchableOpacity onPress={() => updateCartQuantity(item.id, 1)}>
          <Icon name="add-circle-outline" size={28} color="#ff6b00" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => removeFromCart(item.id)}>
          <Icon name="delete-outline" size={28} color="red" />
        </TouchableOpacity>
      </View>
    </View>
  );

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
    <View style={styles.container}>
      <View style={styles.leftPanel}>
        <View style={styles.headerRow}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={24} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Icon name="logout" size={24} color="#ff6b00" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.categoryFilterContainer}>
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
        </View>

        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="inventory" size={60} color="#ddd" />
              <Text style={styles.emptyText}>No products available</Text>
              <Text style={styles.emptySubText}>Try adjusting your search</Text>
            </View>
          }
          contentContainerStyle={styles.productListContent}
        />
      </View>

      <View style={styles.rightPanel}>
        <View style={styles.cartHeader}>
          <Text style={styles.cartTitle}>Shopping Cart</Text>
          {cart.length > 0 && (
            <TouchableOpacity onPress={() => setCart([])} style={styles.clearCartButton}>
              <Text style={styles.clearCartText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <FlatList
          data={cart}
          renderItem={renderCartItem}
          keyExtractor={item => item.id}
          style={styles.cartList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCartContainer}>
              <Icon name="shopping-cart" size={60} color="#ddd" />
              <Text style={styles.emptyCartText}>Cart is empty</Text>
              <Text style={styles.emptyCartSubText}>Add items from the left panel</Text>
            </View>
          }
        />
        
        <View style={styles.totalContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalAmount}>${getTotal().toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (10%)</Text>
            <Text style={styles.totalAmount}>${(getTotal() * 0.1).toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalAmount}>${(getTotal() * 1.1).toFixed(2)}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.checkoutButton, cart.length === 0 && styles.disabledButton]} 
            onPress={handleCheckout}
            disabled={cart.length === 0}
          >
            <Icon name="payment" size={24} color="white" />
            <Text style={styles.checkoutButtonText}>
              {cart.length > 0 ? `Checkout (${cart.length} items)` : 'Cart Empty'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
  leftPanel: {
    flex: 2,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: 'white',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
    padding: 16,
    minHeight: height - 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  logoutButton: {
    padding: 10,
    backgroundColor: '#fff3e0',
    borderRadius: 12,
  },
  categoryFilterContainer: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  categoryButtonActive: {
    backgroundColor: '#ff6b00',
    shadowColor: '#ff6b00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryText: {
    color: '#666',
    fontSize: 14,
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
  productListContent: {
    paddingBottom: 16,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    flex: 1,
    backgroundColor: 'white',
    margin: 6,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  productImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 16,
    color: '#ff6b00',
    fontWeight: '700',
    marginBottom: 4,
  },
  productStock: {
    fontSize: 12,
    color: '#888',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
  },
  cartTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  clearCartButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ffebee',
  },
  clearCartText: {
    color: '#f44336',
    fontSize: 12,
    fontWeight: '600',
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 12,
  },
  cartItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cartItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a2e',
    flex: 1,
  },
  cartItemPrice: {
    fontSize: 15,
    color: '#ff6b00',
    fontWeight: '600',
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cartItemQuantity: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  totalContainer: {
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
    marginTop: 8,
    backgroundColor: 'white',
    paddingBottom: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  grandTotalRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  grandTotalAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ff6b00',
  },
  checkoutButton: {
    backgroundColor: '#ff6b00',
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#ff6b00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  emptyCartContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyCartText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyCartSubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
});