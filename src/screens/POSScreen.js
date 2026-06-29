import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView
} from 'react-native';
import { collection, query, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

export default function POSScreen() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const { logout } = useAuth();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const q = query(collection(db, 'products'));
      const querySnapshot = await getDocs(q);
      const productsData = [];
      const cats = new Set(['All']);
      querySnapshot.forEach((doc) => {
        const product = { id: doc.id, ...doc.data() };
        productsData.push(product);
        if (product.category) cats.add(product.category);
      });
      setProducts(productsData);
      setCategories(Array.from(cats));
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

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
      // Update inventory
      for (const item of cart) {
        const productRef = doc(db, 'products', item.id);
        await updateDoc(productRef, {
          quantity: item.quantity - item.cartQuantity
        });
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
        timestamp: new Date(),
        status: 'completed'
      };

      await addDoc(collection(db, 'sales'), sale);

      Alert.alert('Success', 'Checkout completed successfully!');
      setCart([]);
      fetchProducts(); // Refresh inventory
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

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory && product.quantity > 0;
  });

  const renderProductItem = ({ item }) => (
    <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
      <Text style={styles.productName}>{item.name}</Text>
      <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
      <Text style={styles.productStock}>Stock: {item.quantity}</Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.leftPanel}>
        <View style={styles.headerRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Icon name="logout" size={24} color="#ff6b00" />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal style={styles.categoryFilter}>
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
              ]}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
        />
      </View>

      <View style={styles.rightPanel}>
        <Text style={styles.cartTitle}>Shopping Cart</Text>
        <FlatList
          data={cart}
          renderItem={renderCartItem}
          keyExtractor={item => item.id}
          style={styles.cartList}
        />
        <View style={styles.totalContainer}>
          <Text style={styles.totalText}>Total: ${getTotal().toFixed(2)}</Text>
          <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
            <Text style={styles.checkoutButtonText}>Checkout</Text>
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
  leftPanel: {
    flex: 2,
    padding: 10,
  },
  rightPanel: {
    flex: 1,
    backgroundColor: 'white',
    borderLeftWidth: 1,
    borderLeftColor: '#ddd',
    padding: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'white',
    marginRight: 10,
  },
  logoutButton: {
    padding: 8,
  },
  categoryFilter: {
    marginBottom: 10,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
  },
  categoryButtonActive: {
    backgroundColor: '#ff6b00',
  },
  categoryText: {
    color: '#666',
  },
  categoryTextActive: {
    color: 'white',
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    flex: 1,
    backgroundColor: 'white',
    margin: 5,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
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
  cartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  cartList: {
    flex: 1,
  },
  cartItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  cartItemInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  cartItemName: {
    fontSize: 14,
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#ff6b00',
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  cartItemQuantity: {
    fontSize: 16,
    marginHorizontal: 15,
  },
  totalContainer: {
    borderTopWidth: 2,
    borderTopColor: '#ddd',
    paddingTop: 15,
    marginTop: 10,
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  checkoutButton: {
    backgroundColor: '#ff6b00',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});