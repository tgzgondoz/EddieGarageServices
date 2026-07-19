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
  Modal,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDatabaseInstance, ref, onValue, update, push, set } from '../config/firebase';
import moment from 'moment';

const { width, height } = Dimensions.get('window');

const POSScreen = () => {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [customerName, setCustomerName] = useState('');
  const [categories, setCategories] = useState(['All']);
  const [processing, setProcessing] = useState(false);
  const [cartVisible, setCartVisible] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    const db = getDatabaseInstance();
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const productsList = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      setProducts(productsList);
      const uniqueCategories = ['All', ...new Set(productsList.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
      setLoading(false);
    });
  };

  const addToCart = (product) => {
    if (product.quantity <= 0) {
      Alert.alert('Out of Stock', `${product.name} is out of stock!`);
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.cartQuantity + 1 > product.quantity) {
        Alert.alert('Limit Reached', `Only ${product.quantity} units available in stock`);
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
    
    if (!cartVisible && cart.length === 0) {
      setCartVisible(true);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
    if (cart.length <= 1) {
      setCartVisible(false);
    }
  };

  const updateQuantity = (productId, newQuantity) => {
    const product = products.find(p => p.id === productId);
    if (newQuantity > product.quantity) {
      Alert.alert('Limit Reached', `Only ${product.quantity} units available`);
      return;
    }
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map(item =>
        item.id === productId
          ? { ...item, cartQuantity: newQuantity }
          : item
      ));
    }
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.sellPrice * item.cartQuantity), 0);
  };

  const getTotal = () => {
    return getSubtotal();
  };

  const getItemCount = () => {
    return cart.reduce((sum, item) => sum + item.cartQuantity, 0);
  };

  const processCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to the cart');
      return;
    }

    setProcessing(true);
    try {
      const db = getDatabaseInstance();
      const salesRef = ref(db, 'sales');
      const newSaleRef = push(salesRef);
      const totalAmount = getTotal();
      
      const saleData = {
        id: newSaleRef.key,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          sellPrice: item.sellPrice,
          buyPrice: item.buyPrice,
          quantity: item.cartQuantity,
          subtotal: item.sellPrice * item.cartQuantity
        })),
        subtotal: getSubtotal(),
        total: totalAmount,
        paymentMethod: paymentMethod,
        amountReceived: totalAmount,
        change: 0,
        customerName: customerName || 'Walk-in Customer',
        timestamp: new Date().toISOString(),
        date: moment().format('YYYY-MM-DD'),
        time: moment().format('HH:mm:ss')
      };
      
      await set(newSaleRef, saleData);
      
      for (const item of cart) {
        const productRef = ref(db, `products/${item.id}`);
        const newQuantity = item.quantity - item.cartQuantity;
        await update(productRef, { quantity: newQuantity });
      }
      
      Alert.alert(
        '✅ Success!',
        `Sale completed!\n\nTotal: $${totalAmount.toFixed(2)}\nItems: ${getItemCount()}\n\nThank you for your purchase!`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCart([]);
              setCheckoutModal(false);
              setCustomerName('');
              setCartVisible(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Checkout error:', error);
      Alert.alert('Error', 'Failed to process sale');
    } finally {
      setProcessing(false);
    }
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to clear all items?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => {
          setCart([]);
          setCartVisible(false);
        }}
      ]
    );
  };

  const getStockStatus = (quantity) => {
    if (quantity <= 0) return { label: 'Out of Stock', color: '#EF4444' };
    if (quantity < 10) return { label: 'Low Stock', color: '#F59E0B' };
    return { label: 'In Stock', color: '#000f3f' };
  };

  const renderProduct = ({ item }) => {
    const status = getStockStatus(item.quantity);
    const isOutOfStock = item.quantity <= 0;
    const description = item.sku || 'No description';
    
    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          isOutOfStock && styles.outOfStockCard
        ]}
        onPress={() => addToCart(item)}
        disabled={isOutOfStock}
        activeOpacity={0.7}
      >
        <View style={styles.productInfo}>
          <View style={styles.productHeader}>
            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
            {item.quantity < 10 && item.quantity > 0 && (
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockBadgeText}>Low</Text>
              </View>
            )}
          </View>
          <View style={styles.productDescriptionContainer}>
            <Icon name="document-text-outline" size={10} color="#6B7280" />
            <Text style={styles.productDescription} numberOfLines={1}>
              {description}
            </Text>
          </View>
          <Text style={styles.productPrice}>${item.sellPrice?.toFixed(2)}</Text>
          <View style={styles.stockContainer}>
            <View style={[styles.stockDot, { backgroundColor: status.color }]} />
            <Text style={styles.stockStatus}>{item.quantity} left</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.addButton, isOutOfStock && styles.disabledButton]}
          onPress={() => addToCart(item)}
          disabled={isOutOfStock}
        >
          <Icon name="add-circle" size={42} color={isOutOfStock ? '#D1D5DB' : '#000f3f'} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderCartItem = ({ item }) => {
    const itemTotal = item.sellPrice * item.cartQuantity;
    
    return (
      <View style={styles.cartItem}>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.cartItemPrice}>
            ${item.sellPrice?.toFixed(2)} × {item.cartQuantity}
          </Text>
        </View>
        <View style={styles.cartItemControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.cartQuantity - 1)}
          >
            <Icon name="remove" size={14} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.cartItemQuantity}>{item.cartQuantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => updateQuantity(item.id, item.cartQuantity + 1)}
          >
            <Icon name="add" size={14} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.cartItemTotal}>${itemTotal.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeFromCart(item.id)}
          >
            <Icon name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading && products.length === 0) {
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
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>POS</Text>
          <Text style={styles.headerSubtitle}>
            {filteredProducts.length} products available
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Icon name="cart-outline" size={22} color="#000f3f" />
          {cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Search and Categories */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search-outline" size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
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
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="cube-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search' : 'Add products to get started'}
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.productsList,
          // Add bottom padding for cart
          { paddingBottom: cart.length > 0 ? 250 + insets.bottom : 80 + insets.bottom }
        ]}
        style={styles.flatList}
      />

      {/* Cart Summary */}
      {cart.length > 0 && (
        <View style={[styles.cartSummary, { bottom: insets.bottom }]}>
          <TouchableOpacity 
            style={styles.cartToggle}
            onPress={() => setCartVisible(!cartVisible)}
          >
            <View style={styles.cartToggleLeft}>
              <Icon name="cart-outline" size={20} color="#000f3f" />
              <Text style={styles.cartToggleText}>
                {getItemCount()} item{getItemCount() !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.cartToggleRight}>
              <Text style={styles.cartToggleTotal}>${getTotal().toFixed(2)}</Text>
              <Icon name={cartVisible ? "chevron-down" : "chevron-up"} size={20} color="#6B7280" />
            </View>
          </TouchableOpacity>

          {cartVisible && (
            <>
              <View style={styles.cartHeader}>
                <View>
                  <Text style={styles.cartTitle}>Current Order</Text>
                  <Text style={styles.cartSubtitle}>{cart.length} product{cart.length !== 1 ? 's' : ''}</Text>
                </View>
                <TouchableOpacity onPress={clearCart} style={styles.clearCartBtn}>
                  <Icon name="trash-outline" size={16} color="#EF4444" />
                  <Text style={styles.clearCartText}>Clear</Text>
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={cart}
                renderItem={renderCartItem}
                keyExtractor={(item) => item.id}
                style={styles.cartList}
                showsVerticalScrollIndicator={false}
              />
              
              <View style={styles.totalContainer}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalAmount}>${getTotal().toFixed(2)}</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.checkoutButton}
                  onPress={() => setCheckoutModal(true)}
                  activeOpacity={0.8}
                >
                  <Icon name="card-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.checkoutButtonText}>Checkout</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      {/* Checkout Modal */}
      <Modal
        visible={checkoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCheckoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Icon name="checkmark-circle-outline" size={24} color="#000f3f" />
                <Text style={styles.modalTitle}>Checkout</Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setCheckoutModal(false)}
              >
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.orderSummary}>
                <Text style={styles.sectionTitle}>Order Summary</Text>
                {cart.slice(0, 3).map((item, index) => (
                  <View key={index} style={styles.orderItem}>
                    <Text style={styles.orderItemName}>
                      {item.name} × {item.cartQuantity}
                    </Text>
                    <Text style={styles.orderItemPrice}>
                      ${(item.sellPrice * item.cartQuantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
                {cart.length > 3 && (
                  <Text style={styles.moreItems}>+{cart.length - 3} more item(s)</Text>
                )}
                <View style={styles.orderTotal}>
                  <Text style={styles.orderTotalLabel}>Total Amount</Text>
                  <Text style={styles.orderTotalAmount}>${getTotal().toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Customer Name</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter customer name"
                  placeholderTextColor="#6B7280"
                  value={customerName}
                  onChangeText={setCustomerName}
                />
              </View>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalLabel}>Payment Method</Text>
                <View style={styles.paymentMethods}>
                  {['cash', 'card', 'mobile'].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentMethod,
                        paymentMethod === method && styles.paymentMethodActive
                      ]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      <Icon 
                        name={
                          method === 'cash' ? 'cash-outline' :
                          method === 'card' ? 'card-outline' :
                          'phone-portrait-outline'
                        } 
                        size={20} 
                        color={paymentMethod === method ? '#FFFFFF' : '#6B7280'} 
                      />
                      <Text style={[
                        styles.paymentMethodText,
                        paymentMethod === method && styles.paymentMethodTextActive
                      ]}>
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.paymentInfo}>
                <View style={styles.paymentInfoRow}>
                  <Text style={styles.paymentInfoLabel}>Amount to Pay</Text>
                  <Text style={styles.paymentInfoValue}>${getTotal().toFixed(2)}</Text>
                </View>
                {paymentMethod === 'cash' && (
                  <View style={styles.paymentInfoRow}>
                    <Text style={styles.paymentInfoLabel}>Change</Text>
                    <Text style={[styles.paymentInfoValue, styles.changeText]}>$0.00</Text>
                  </View>
                )}
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setCheckoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={processCheckout}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.confirmButtonText}>Pay ${getTotal().toFixed(2)}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  headerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000f3f15',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 14,
    color: '#111827',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryScrollContent: {
    paddingHorizontal: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#000f3f',
    borderColor: '#000f3f',
  },
  categoryChipText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  productsList: {
    paddingHorizontal: 6,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 4,
    marginVertical: 4,
    width: '48%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 100,
  },
  outOfStockCard: {
    opacity: 0.6,
    backgroundColor: '#F9FAFB',
  },
  productInfo: {
    flex: 1,
    marginRight: 4,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  lowStockBadge: {
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  lowStockBadgeText: {
    fontSize: 7,
    color: '#F59E0B',
    fontWeight: '600',
  },
  productDescriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 9,
    color: '#6B7280',
    flex: 1,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000f3f',
    marginBottom: 2,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  stockDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  stockStatus: {
    fontSize: 9,
    color: '#6B7280',
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  cartSummary: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
    maxHeight: '60%',
  },
  cartToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cartToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cartToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  cartToggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartToggleTotal: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000f3f',
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cartTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  cartSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  clearCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444410',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  clearCartText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '500',
  },
  cartList: {
    maxHeight: 160,
  },
  cartItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  cartItemInfo: {
    marginBottom: 4,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  cartItemPrice: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  cartItemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000f3f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemQuantity: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    minWidth: 20,
    textAlign: 'center',
  },
  cartItemTotal: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#000f3f',
    textAlign: 'right',
  },
  removeButton: {
    padding: 2,
  },
  totalContainer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000f3f',
  },
  checkoutButton: {
    backgroundColor: '#000f3f',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000f3f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '85%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  orderSummary: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orderItemName: {
    fontSize: 12,
    color: '#374151',
  },
  orderItemPrice: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
  },
  moreItems: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontStyle: 'italic',
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  orderTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  orderTotalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000f3f',
  },
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#F9FAFB',
    color: '#111827',
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  paymentMethod: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentMethodActive: {
    backgroundColor: '#000f3f',
    borderColor: '#000f3f',
  },
  paymentMethodText: {
    color: '#6B7280',
    fontWeight: '500',
    fontSize: 12,
  },
  paymentMethodTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  paymentInfo: {
    backgroundColor: '#000f3f10',
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
    marginBottom: 6,
  },
  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  paymentInfoLabel: {
    fontSize: 13,
    color: '#374151',
  },
  paymentInfoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000f3f',
  },
  changeText: {
    color: '#10B981',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 6,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  cancelModalButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmModalButton: {
    backgroundColor: '#000f3f',
    shadowColor: '#000f3f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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

export default POSScreen;