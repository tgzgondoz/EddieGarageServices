// screens/POSScreen.js
import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Modal,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import { database } from '../config/firebase';
import { ref, onValue, off, update, push, set } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function POSScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartTotal, setCartTotal] = useState(0);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedProductForCategory, setSelectedProductForCategory] = useState(null);
  const { logout } = useAuth();

  // Refs
  const searchInputRef = useRef(null);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];
  const categoryFadeAnim = useState(new Animated.Value(0))[0];
  const categorySlideAnim = useState(new Animated.Value(50))[0];

  // Fetch products and categories
  useEffect(() => {
    const productsRef = ref(database, 'products');
    const categoriesRef = ref(database, 'categories');
    
    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
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
          if (product.category && product.category.trim() !== '') {
            if (typeof product.category === 'object') {
              const categoryName = product.category.name || product.category.value || String(product.category);
              if (categoryName && categoryName.trim() !== '') {
                uniqueCategories.add(categoryName.trim());
              }
            } else {
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

    // Fetch all categories for category management
    const unsubscribeCategories = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const categoriesData = Object.keys(data).map(key => ({
          id: key,
          name: data[key].name,
          ...data[key]
        }));
        categoriesData.sort((a, b) => a.name.localeCompare(b.name));
        setAllCategories(categoriesData);
      } else {
        setAllCategories([]);
      }
    });

    return () => {
      off(productsRef);
      off(categoriesRef);
    };
  }, []);

  useEffect(() => {
    const total = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
    setCartTotal(total);
  }, [cart]);

  // Animate checkout modal
  useEffect(() => {
    if (showCheckoutModal) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 0.9,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showCheckoutModal]);

  // Animate category selector modal
  useEffect(() => {
    if (showCategoryModal) {
      Animated.parallel([
        Animated.timing(categoryFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(categorySlideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(categoryFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(categorySlideAnim, {
          toValue: 50,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showCategoryModal]);

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
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => {
          setCart(cart.filter(item => item.id !== productId));
        }}
      ]
    );
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to clear all items from cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => {
          setCart([]);
        }}
      ]
    );
  };

  const getTotal = () => {
    return cartTotal;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Cart Empty', 'Please add items to cart first');
      return;
    }
    setShowCheckoutModal(true);
  };

  const processCheckout = async () => {
    setProcessingPayment(true);
    try {
      for (const item of cart) {
        const productRef = ref(database, `products/${item.id}`);
        const newQuantity = item.quantity - item.cartQuantity;
        await update(productRef, { quantity: newQuantity });
      }

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

      const salesRef = ref(database, 'sales');
      const newSaleRef = push(salesRef);
      await set(newSaleRef, sale);

      setProcessingPayment(false);
      setShowCheckoutModal(false);
      Alert.alert('✅ Success', 'Checkout completed successfully!');
      setCart([]);
    } catch (error) {
      console.error('Checkout error:', error);
      setProcessingPayment(false);
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

  // Category Selector Modal for filtering
  const CategorySelectorModal = () => (
    <Modal
      visible={showCategoryModal}
      transparent={true}
      animationType="none"
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.categorySelectorContent,
            {
              opacity: categoryFadeAnim,
              transform: [{ translateY: categorySlideAnim }]
            }
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Icon name="category" size={28} color="#FF6B00" />
              <Text style={styles.modalTitle}>Filter by Category</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowCategoryModal(false)}
              style={styles.modalCloseButton}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.categoryList}>
            <TouchableOpacity
              style={[
                styles.categoryOption,
                selectedCategory === 'All' && styles.categoryOptionSelected
              ]}
              onPress={() => {
                setSelectedCategory('All');
                setShowCategoryModal(false);
              }}
            >
              <Text style={[
                styles.categoryOptionText,
                selectedCategory === 'All' && styles.categoryOptionTextSelected
              ]}>
                All Categories
              </Text>
              {selectedCategory === 'All' && (
                <Icon name="check-circle" size={20} color="#FF6B00" />
              )}
            </TouchableOpacity>
            
            {allCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryOption,
                  selectedCategory === cat.name && styles.categoryOptionSelected
                ]}
                onPress={() => {
                  setSelectedCategory(cat.name);
                  setShowCategoryModal(false);
                }}
              >
                <Text style={[
                  styles.categoryOptionText,
                  selectedCategory === cat.name && styles.categoryOptionTextSelected
                ]}>
                  {cat.name}
                </Text>
                {selectedCategory === cat.name && (
                  <Icon name="check-circle" size={20} color="#FF6B00" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.manageCategoriesButton}
            onPress={() => {
              setShowCategoryModal(false);
              navigation.navigate('CategoryManagement');
            }}
          >
            <Icon name="settings" size={20} color="#FF6B00" />
            <Text style={styles.manageCategoriesText}>Manage Categories</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );

  const renderProductItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.productCard} 
      onPress={() => addToCart(item)}
      activeOpacity={0.7}
    >
      <View style={styles.productImagePlaceholder}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.productImage} />
        ) : (
          <Icon name="inventory-2" size={32} color="#ccc" />
        )}
        {item.quantity <= 5 && item.quantity > 0 && (
          <View style={styles.lowStockBadge}>
            <Text style={styles.lowStockBadgeText}>Low</Text>
          </View>
        )}
        {item.quantity === 0 && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockBadgeText}>Out</Text>
          </View>
        )}
      </View>
      <Text style={styles.productName} numberOfLines={1}>{item.name || 'Unnamed'}</Text>
      <Text style={styles.productPrice}>${item.price?.toFixed(2) || '0.00'}</Text>
      <Text style={[styles.productStock, item.quantity <= 5 && styles.lowStock]}>
        Stock: {item.quantity || 0}
      </Text>
    </TouchableOpacity>
  );

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.cartItemPrice}>${item.price.toFixed(2)}</Text>
      </View>
      <View style={styles.cartItemControls}>
        <TouchableOpacity 
          style={styles.cartItemButton}
          onPress={() => updateCartQuantity(item.id, -1)}
        >
          <Icon name="remove" size={16} color="#fff" />
        </TouchableOpacity>
        <View style={styles.cartItemQuantityBadge}>
          <Text style={styles.cartItemQuantityText}>{item.cartQuantity}</Text>
        </View>
        <TouchableOpacity 
          style={styles.cartItemButton}
          onPress={() => updateCartQuantity(item.id, 1)}
        >
          <Icon name="add" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Checkout Modal Component
  const CheckoutModal = () => (
    <Modal
      visible={showCheckoutModal}
      transparent={true}
      animationType="none"
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[
            styles.modalContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Icon name="shopping-bag" size={28} color="#FF6B00" />
              <Text style={styles.modalTitle}>Order Summary</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowCheckoutModal(false)}
              style={styles.modalCloseButton}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalItemsList} showsVerticalScrollIndicator={false}>
            {cart.map((item) => (
              <View key={item.id} style={styles.modalItem}>
                <View style={styles.modalItemLeft}>
                  <View style={styles.modalItemQuantity}>
                    <Text style={styles.modalItemQuantityText}>{item.cartQuantity}x</Text>
                  </View>
                  <View>
                    <Text style={styles.modalItemName}>{item.name}</Text>
                    <Text style={styles.modalItemPrice}>${item.price.toFixed(2)} each</Text>
                  </View>
                </View>
                <Text style={styles.modalItemTotal}>
                  ${(item.price * item.cartQuantity).toFixed(2)}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalDivider} />

          <View style={styles.modalTotalSection}>
            <View style={styles.modalTotalRow}>
              <Text style={styles.modalTotalLabel}>Subtotal</Text>
              <Text style={styles.modalTotalAmount}>${getTotal().toFixed(2)}</Text>
            </View>
            <View style={styles.modalTotalRow}>
              <Text style={styles.modalTotalLabel}>Total Items</Text>
              <Text style={styles.modalTotalAmount}>{cart.reduce((sum, item) => sum + item.cartQuantity, 0)} items</Text>
            </View>
            <View style={styles.modalGrandTotalRow}>
              <Text style={styles.modalGrandTotalLabel}>Total Amount</Text>
              <Text style={styles.modalGrandTotalAmount}>${getTotal().toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={() => setShowCheckoutModal(false)}
              disabled={processingPayment}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalConfirmButton]}
              onPress={processCheckout}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <View style={styles.loadingContainer}>
                  <View style={styles.smallLoadingSpinner} />
                  <Text style={styles.modalConfirmButtonText}>Processing...</Text>
                </View>
              ) : (
                <>
                  <Icon name="check-circle" size={22} color="white" />
                  <Text style={styles.modalConfirmButtonText}>Confirm Payment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
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
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContainer}>
        {/* Left Panel - Products */}
        <View style={styles.leftPanel}>
          <View style={styles.headerRow}>
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                ref={searchInputRef}
                style={styles.searchInput}
                placeholder="Search products..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchButton}
                >
                  <Icon name="close" size={18} color="#999" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity 
              onPress={() => setShowCategoryModal(true)} 
              style={styles.categoryFilterButton}
            >
              <Icon name="filter-list" size={20} color="#ff6b00" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
              <Icon name="logout" size={20} color="#ff6b00" />
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
                <Icon name="inventory" size={50} color="#ddd" />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No products match your search' : 'No products available'}
                </Text>
                {!searchQuery && (
                  <TouchableOpacity
                    style={styles.emptyManageCategoriesButton}
                    onPress={() => navigation.navigate('CategoryManagement')}
                  >
                    <Icon name="category" size={16} color="#ff6b00" />
                    <Text style={styles.emptyManageCategoriesText}>Manage Categories</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            contentContainerStyle={styles.productListContent}
          />
        </View>

        {/* Right Panel - Shopping Cart */}
        <View style={styles.rightPanel}>
          <View style={styles.cartHeader}>
            <View>
              <Text style={styles.cartTitle}>Shopping Cart</Text>
              <Text style={styles.cartSubtitle}>
                {cart.reduce((sum, item) => sum + item.cartQuantity, 0)} items
              </Text>
            </View>
            {cart.length > 0 && (
              <TouchableOpacity onPress={clearCart} style={styles.clearCartButton}>
                <Icon name="delete-sweep" size={18} color="#f44336" />
                <Text style={styles.clearCartText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.cartListContainer}>
            <FlatList
              data={cart}
              renderItem={renderCartItem}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyCartContainer}>
                  <Icon name="shopping-cart" size={50} color="#ddd" />
                  <Text style={styles.emptyCartText}>Cart is Empty</Text>
                  <Text style={styles.emptyCartSubText}>Add items from the catalog</Text>
                </View>
              }
              contentContainerStyle={cart.length === 0 && styles.emptyCartContent}
            />
          </View>
          
          <View style={styles.totalContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalAmount}>${getTotal().toFixed(2)}</Text>
            </View>
            <View style={styles.totalDivider} />
            <View style={[styles.totalRow, styles.grandTotalRow]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalAmount}>${getTotal().toFixed(2)}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.checkoutButton, cart.length === 0 && styles.disabledButton]} 
              onPress={handleCheckout}
              disabled={cart.length === 0}
            >
              <Icon name="payment" size={20} color="white" />
              <Text style={styles.checkoutButtonText}>
                {cart.length > 0 ? `Checkout (${cart.reduce((sum, item) => sum + item.cartQuantity, 0)})` : 'Cart Empty'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <CheckoutModal />
      <CategorySelectorModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
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
  smallLoadingSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
    borderTopColor: 'transparent',
    marginRight: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  leftPanel: {
    flex: 2,
    padding: 10,
    backgroundColor: '#f8f9fa',
  },
  rightPanel: {
    flex: 1.2,
    backgroundColor: 'white',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 10,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
  },
  clearSearchButton: {
    padding: 4,
  },
  categoryFilterButton: {
    padding: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    marginRight: 8,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 10,
  },
  categoryFilterContainer: {
    marginBottom: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingVertical: 2,
  },
  categoryScrollContent: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginRight: 6,
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
  productListContent: {
    paddingBottom: 10,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    flex: 1,
    backgroundColor: 'white',
    margin: 4,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    minHeight: 120,
  },
  productImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  lowStockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ff9800',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
  },
  lowStockBadgeText: {
    fontSize: 8,
    color: 'white',
    fontWeight: '700',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f44336',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
  },
  outOfStockBadgeText: {
    fontSize: 8,
    color: 'white',
    fontWeight: '700',
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 2,
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 14,
    color: '#ff6b00',
    fontWeight: '700',
    marginBottom: 2,
  },
  productStock: {
    fontSize: 11,
    color: '#888',
  },
  lowStock: {
    color: '#f44336',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#f0f0f0',
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  cartSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 1,
  },
  clearCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#ffebee',
  },
  clearCartText: {
    color: '#f44336',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  cartListContainer: {
    flex: 1,
    marginBottom: 4,
  },
  emptyCartContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cartItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cartItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 8,
  },
  cartItemPrice: {
    fontSize: 13,
    color: '#ff6b00',
    fontWeight: '600',
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cartItemButton: {
    backgroundColor: '#ff6b00',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemQuantityBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 2,
    minWidth: 30,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cartItemQuantityText: {
    color: '#1a1a2e',
    fontSize: 14,
    fontWeight: '700',
  },
  totalContainer: {
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
    backgroundColor: 'white',
    paddingBottom: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  grandTotalRow: {
    marginTop: 2,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 13,
    color: '#666',
  },
  totalAmount: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  grandTotalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ff6b00',
  },
  checkoutButton: {
    backgroundColor: '#ff6b00',
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    minHeight: 44,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  emptyManageCategoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
  },
  emptyManageCategoriesText: {
    color: '#ff6b00',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
  emptyCartContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyCartText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  emptyCartSubText: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
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
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    marginLeft: 12,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalItemsList: {
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  modalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalItemQuantity: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 36,
    alignItems: 'center',
  },
  modalItemQuantityText: {
    color: '#ff6b00',
    fontWeight: '700',
    fontSize: 14,
  },
  modalItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a2e',
  },
  modalItemPrice: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  modalItemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ff6b00',
  },
  modalDivider: {
    height: 2,
    backgroundColor: '#f0f0f0',
    marginVertical: 16,
  },
  modalTotalSection: {
    marginBottom: 20,
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTotalLabel: {
    fontSize: 15,
    color: '#666',
  },
  modalTotalAmount: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  modalGrandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#ff6b00',
  },
  modalGrandTotalLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  modalGrandTotalAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ff6b00',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  modalCancelButton: {
    backgroundColor: '#f5f5f5',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmButton: {
    backgroundColor: '#ff6b00',
    shadowColor: '#ff6b00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  // Category Selector Modal
  categorySelectorContent: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '70%',
  },
  categoryList: {
    maxHeight: 300,
  },
  categoryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  categoryOptionSelected: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
  },
  categoryOptionText: {
    fontSize: 15,
    color: '#333',
  },
  categoryOptionTextSelected: {
    color: '#ff6b00',
    fontWeight: '600',
  },
  manageCategoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  manageCategoriesText: {
    color: '#ff6b00',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});