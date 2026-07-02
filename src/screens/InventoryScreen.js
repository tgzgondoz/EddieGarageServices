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
  Animated,
  Modal,
  SafeAreaView,
} from 'react-native';
import { database } from '../config/firebase';
import { ref, onValue, off, update, push, set, remove } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function InventoryScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [processingUpdate, setProcessingUpdate] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [allCategories, setAllCategories] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const { logout } = useAuth();

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

    // Fetch all categories for the selector
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
    }, (error) => {
      console.error('Error fetching categories:', error);
    });

    return () => {
      off(productsRef);
      off(categoriesRef);
    };
  }, []);

  // Animate modals
  useEffect(() => {
    if (showEditModal) {
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
  }, [showEditModal]);

  // Animate category selector
  useEffect(() => {
    if (showCategorySelector) {
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
  }, [showCategorySelector]);

  const updateStock = async (productId, currentStock, change) => {
    const newStock = currentStock + change;
    if (newStock < 0) {
      Alert.alert('Error', 'Stock cannot be negative');
      return;
    }

    try {
      const productRef = ref(database, `products/${productId}`);
      await update(productRef, { quantity: newStock });
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

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setEditName(product.name || '');
    setEditPrice(String(product.price || ''));
    setEditQuantity(String(product.quantity || ''));
    setEditCategory(product.category || '');
    setShowEditModal(true);
  };

  const updateProduct = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Product name is required');
      return;
    }
    if (!editPrice.trim() || isNaN(parseFloat(editPrice))) {
      Alert.alert('Error', 'Valid price is required');
      return;
    }
    if (!editQuantity.trim() || isNaN(parseInt(editQuantity))) {
      Alert.alert('Error', 'Valid quantity is required');
      return;
    }

    setProcessingUpdate(true);
    try {
      const productRef = ref(database, `products/${selectedProduct.id}`);
      await update(productRef, {
        name: editName.trim(),
        price: parseFloat(editPrice),
        quantity: parseInt(editQuantity),
        category: editCategory.trim() || 'Uncategorized',
      });
      setProcessingUpdate(false);
      setShowEditModal(false);
      Alert.alert('Success', 'Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      setProcessingUpdate(false);
      Alert.alert('Error', 'Failed to update product');
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

  const selectCategoryForEdit = (categoryName) => {
    setEditCategory(categoryName);
    setShowCategorySelector(false);
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
    const productCategory = getProductCategory(product);
    const matchesCategory = selectedCategory === 'All' || productCategory === selectedCategory;
    const matchesStock = lowStockOnly ? (product.quantity || 0) <= 10 : true;
    return matchesSearch && matchesCategory && matchesStock;
  });

  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetails', { product: item })}
      activeOpacity={0.7}
    >
      <View style={styles.productInfo}>
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{item.name || 'Unnamed Product'}</Text>
          <View style={[styles.stockBadge, (item.quantity || 0) <= 10 && styles.lowStockBadge]}>
            <Text style={[styles.stockBadgeText, (item.quantity || 0) <= 10 && styles.lowStockBadgeText]}>
              {item.quantity || 0} in stock
            </Text>
          </View>
        </View>
        <Text style={styles.productSku}>SKU: {item.sku || 'N/A'}</Text>
        <Text style={styles.productCategory}>
          <Icon name="category" size={14} color="#666" /> {getProductCategory(item) || 'Uncategorized'}
        </Text>
        <Text style={styles.productPrice}>${item.price?.toFixed(2) || '0.00'}</Text>
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditModal(item)}
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
            style={styles.stockButton}
          >
            <Icon name="remove-circle-outline" size={32} color="#ff6b00" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => updateStock(item.id, item.quantity || 0, 1)}
            disabled={loading}
            style={styles.stockButton}
          >
            <Icon name="add-circle-outline" size={32} color="#ff6b00" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Category Selector Modal for Edit
  const CategorySelectorModal = () => (
    <Modal
      visible={showCategorySelector}
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
              <Text style={styles.modalTitle}>Select Category</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowCategorySelector(false)}
              style={styles.modalCloseButton}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.categoryList}>
            {allCategories.length === 0 ? (
              <View style={styles.emptyCategoryContainer}>
                <Icon name="category" size={40} color="#ddd" />
                <Text style={styles.emptyCategoryText}>No categories available</Text>
                <TouchableOpacity
                  style={styles.createCategoryButton}
                  onPress={() => {
                    setShowCategorySelector(false);
                    navigation.navigate('CategoryManagement');
                  }}
                >
                  <Text style={styles.createCategoryText}>Manage Categories</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    !editCategory && styles.categoryOptionSelected
                  ]}
                  onPress={() => selectCategoryForEdit('')}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    !editCategory && styles.categoryOptionTextSelected
                  ]}>
                    None (Uncategorized)
                  </Text>
                  {!editCategory && (
                    <Icon name="check-circle" size={20} color="#FF6B00" />
                  )}
                </TouchableOpacity>
                {allCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      editCategory === cat.name && styles.categoryOptionSelected
                    ]}
                    onPress={() => selectCategoryForEdit(cat.name)}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      editCategory === cat.name && styles.categoryOptionTextSelected
                    ]}>
                      {cat.name}
                    </Text>
                    {editCategory === cat.name && (
                      <Icon name="check-circle" size={20} color="#FF6B00" />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            style={styles.manageCategoriesButton}
            onPress={() => {
              setShowCategorySelector(false);
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

  // Edit Modal Component
  const EditModal = () => (
    <Modal
      visible={showEditModal}
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
              <Icon name="edit" size={28} color="#FF6B00" />
              <Text style={styles.modalTitle}>Edit Product</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowEditModal(false)}
              style={styles.modalCloseButton}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalForm}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Product Name *</Text>
              <TextInput
                style={styles.formInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter product name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <TouchableOpacity
                style={styles.categorySelectorInput}
                onPress={() => setShowCategorySelector(true)}
              >
                <Text style={[
                  styles.categorySelectorText,
                  !editCategory && styles.categorySelectorPlaceholder
                ]}>
                  {editCategory || 'Select a category'}
                </Text>
                <Icon name="arrow-drop-down" size={24} color="#999" />
              </TouchableOpacity>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, styles.formRowItem]}>
                <Text style={styles.formLabel}>Price ($) *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editPrice}
                  onChangeText={setEditPrice}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={[styles.formGroup, styles.formRowItem]}>
                <Text style={styles.formLabel}>Quantity *</Text>
                <TextInput
                  style={styles.formInput}
                  value={editQuantity}
                  onChangeText={setEditQuantity}
                  placeholder="0"
                  keyboardType="number-pad"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={() => setShowEditModal(false)}
              disabled={processingUpdate}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalConfirmButton]}
              onPress={updateProduct}
              disabled={processingUpdate}
            >
              {processingUpdate ? (
                <View style={styles.loadingContainer}>
                  <View style={styles.smallLoadingSpinner} />
                  <Text style={styles.modalConfirmButtonText}>Updating...</Text>
                </View>
              ) : (
                <>
                  <Icon name="save" size={22} color="white" />
                  <Text style={styles.modalConfirmButtonText}>Update</Text>
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
        </View>
        <TouchableOpacity 
          onPress={() => navigation.navigate('CategoryManagement')} 
          style={styles.categoryNavButton}
        >
          <Icon name="category" size={20} color="#ff6b00" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Icon name="logout" size={20} color="#ff6b00" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
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
        
        <TouchableOpacity
          style={[styles.lowStockFilter, lowStockOnly && styles.lowStockFilterActive]}
          onPress={() => setLowStockOnly(!lowStockOnly)}
        >
          <Icon name="warning" size={18} color={lowStockOnly ? '#fff' : '#ff6b00'} />
          <Text style={[styles.lowStockFilterText, lowStockOnly && styles.lowStockFilterTextActive]}>
            Low Stock
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="inventory" size={50} color="#ddd" />
            <Text style={styles.emptyText}>
              {searchQuery || lowStockOnly ? 'No products match your filters' : 'No products available'}
            </Text>
            {!searchQuery && !lowStockOnly && (
              <>
                <Text style={styles.emptySubText}>Add your first product using the + button</Text>
                <TouchableOpacity
                  style={styles.manageCategoriesEmptyButton}
                  onPress={() => navigation.navigate('CategoryManagement')}
                >
                  <Icon name="category" size={16} color="#ff6b00" />
                  <Text style={styles.manageCategoriesEmptyText}>Manage Categories</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddEditProduct')}
      >
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <EditModal />
      <CategorySelectorModal />
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
    marginRight: 8,
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
  categoryNavButton: {
    padding: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
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
  lowStockFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ff6b00',
    marginLeft: 'auto',
    backgroundColor: 'white',
  },
  lowStockFilterActive: {
    backgroundColor: '#ff6b00',
    borderColor: '#ff6b00',
  },
  lowStockFilterText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#ff6b00',
    fontWeight: '500',
  },
  lowStockFilterTextActive: {
    color: 'white',
  },
  list: {
    padding: 12,
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    flex: 1,
  },
  stockBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  lowStockBadge: {
    backgroundColor: '#ffebee',
  },
  stockBadgeText: {
    fontSize: 11,
    color: '#4caf50',
    fontWeight: '600',
  },
  lowStockBadgeText: {
    color: '#f44336',
  },
  productSku: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    color: '#ff6b00',
    fontWeight: '700',
  },
  productActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  actionButton: {
    marginBottom: 4,
    padding: 4,
  },
  stockControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockButton: {
    padding: 2,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  emptySubText: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  manageCategoriesEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
  },
  manageCategoriesEmptyText: {
    color: '#ff6b00',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 6,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#ff6b00',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#ff6b00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    marginLeft: 12,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalForm: {
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formRowItem: {
    flex: 1,
    marginRight: 8,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  categorySelectorInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
  },
  categorySelectorText: {
    fontSize: 14,
    color: '#333',
  },
  categorySelectorPlaceholder: {
    color: '#999',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
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
  emptyCategoryContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyCategoryText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  createCategoryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
  },
  createCategoryText: {
    color: '#ff6b00',
    fontWeight: '600',
    fontSize: 13,
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