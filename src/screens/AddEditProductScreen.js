// screens/AddEditProductScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { database } from '../config/firebase';
import { ref, set, update, push, onValue, off } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function AddEditProductScreen({ route, navigation }) {
  const product = route.params?.product;
  const isEditing = !!product;
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [purchasePrice, setPurchasePrice] = useState(product?.purchasePrice?.toString() || '');
  const [sellingPrice, setSellingPrice] = useState(product?.sellingPrice?.toString() || '');
  const [quantity, setQuantity] = useState(product?.quantity?.toString() || '');
  const [category, setCategory] = useState(product?.category || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [profit, setProfit] = useState(0);
  const [profitMargin, setProfitMargin] = useState(0);

  // Calculate profit and margin
  useEffect(() => {
    const cost = parseFloat(purchasePrice) || 0;
    const price = parseFloat(sellingPrice) || 0;
    const calculatedProfit = price - cost;
    setProfit(calculatedProfit);
    
    if (cost > 0 && price > 0) {
      const calculatedMargin = ((price - cost) / price) * 100;
      setProfitMargin(calculatedMargin);
    } else {
      setProfitMargin(0);
    }
  }, [purchasePrice, sellingPrice]);

  // Fetch categories from Realtime Database
  useEffect(() => {
    const categoriesRef = ref(database, 'categories');
    
    const unsubscribe = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const categoriesData = Object.keys(data).map(key => ({
          id: key,
          name: data[key].name,
          ...data[key]
        }));
        categoriesData.sort((a, b) => a.name.localeCompare(b.name));
        setCategories(categoriesData);
      } else {
        setCategories([]);
      }
      setCategoryLoading(false);
    }, (error) => {
      console.error('Error fetching categories:', error);
      setCategoryLoading(false);
    });

    return () => off(categoriesRef);
  }, []);

  const validateField = (field, value) => {
    const newErrors = { ...errors };
    switch (field) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'Product name is required';
        } else {
          delete newErrors.name;
        }
        break;
      case 'purchasePrice':
        if (!value || isNaN(parseFloat(value)) || parseFloat(value) < 0) {
          newErrors.purchasePrice = 'Please enter a valid purchase price';
        } else {
          delete newErrors.purchasePrice;
        }
        break;
      case 'sellingPrice':
        if (!value || isNaN(parseFloat(value)) || parseFloat(value) < 0) {
          newErrors.sellingPrice = 'Please enter a valid selling price';
        } else {
          delete newErrors.sellingPrice;
        }
        break;
      case 'quantity':
        if (!value || isNaN(parseInt(value)) || parseInt(value) < 0) {
          newErrors.quantity = 'Please enter a valid quantity';
        } else {
          delete newErrors.quantity;
        }
        break;
      default:
        break;
    }
    setErrors(newErrors);
  };

  const handleSubmit = async () => {
    validateField('name', name);
    validateField('purchasePrice', purchasePrice);
    validateField('sellingPrice', sellingPrice);
    validateField('quantity', quantity);

    if (!name.trim() || !purchasePrice || !sellingPrice || !quantity) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    if (Object.keys(errors).length > 0) {
      Alert.alert('Validation Error', 'Please fix all errors before submitting');
      return;
    }

    const cost = parseFloat(purchasePrice);
    const price = parseFloat(sellingPrice);
    if (price < cost) {
      Alert.alert('Warning', 'Selling price is less than purchase price. This will result in a loss.');
    }

    setLoading(true);

    const productData = {
      name: name.trim(),
      description: description.trim(),
      category: category || 'Uncategorized',
      sku: sku.trim() || '',
      imageUrl: imageUrl.trim() || 'https://via.placeholder.com/300',
      purchasePrice: parseFloat(purchasePrice),
      sellingPrice: parseFloat(sellingPrice),
      quantity: parseInt(quantity),
      profit: parseFloat(sellingPrice) - parseFloat(purchasePrice),
      profitMargin: ((parseFloat(sellingPrice) - parseFloat(purchasePrice)) / parseFloat(sellingPrice)) * 100,
      updatedAt: new Date().toISOString()
    };

    try {
      if (isEditing) {
        const productRef = ref(database, `products/${product.id}`);
        await update(productRef, productData);
        Alert.alert('Success', 'Product updated successfully');
      } else {
        productData.createdAt = new Date().toISOString();
        const productsRef = ref(database, 'products');
        const newProductRef = push(productsRef);
        await set(newProductRef, productData);
        Alert.alert('Success', 'Product added successfully');
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', `Failed to save product: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const selectCategory = (categoryName) => {
    setCategory(categoryName);
    setShowCategoryModal(false);
  };

  const getCategoryDisplay = () => {
    if (!category || category === 'Uncategorized') return 'Select Category';
    return category;
  };

  const getProfitColor = () => {
    if (profit > 0) return '#4caf50';
    if (profit < 0) return '#f44336';
    return '#FF9800';
  };

  // Category Selection Modal
  const CategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity
              onPress={() => setShowCategoryModal(false)}
              style={styles.modalCloseButton}
            >
              <Icon name="close" size={24} color="#90a5a0" />
            </TouchableOpacity>
          </View>

          {categoryLoading ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color="#178556" />
              <Text style={styles.modalLoadingText}>Loading categories...</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={categories}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryItem,
                      category === item.name && styles.categoryItemSelected
                    ]}
                    onPress={() => selectCategory(item.name)}
                  >
                    <Text style={[
                      styles.categoryItemText,
                      category === item.name && styles.categoryItemTextSelected
                    ]}>
                      {item.name}
                    </Text>
                    {category === item.name && (
                      <Icon name="check-circle" size={20} color="#178556" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.modalEmptyContainer}>
                    <Icon name="category" size={40} color="#90a5a0" />
                    <Text style={styles.modalEmptyText}>No categories found</Text>
                    <TouchableOpacity
                      style={styles.modalAddCategoryButton}
                      onPress={() => {
                        setShowCategoryModal(false);
                        navigation.navigate('CategoryManagement');
                      }}
                    >
                      <Text style={styles.modalAddCategoryText}>Manage Categories</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
              <TouchableOpacity
                style={styles.manageCategoriesButton}
                onPress={() => {
                  setShowCategoryModal(false);
                  navigation.navigate('CategoryManagement');
                }}
              >
                <Icon name="settings" size={20} color="#178556" />
                <Text style={styles.manageCategoriesText}>Manage Categories</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.formContainer}>
            {/* Image Section */}
            <View style={styles.imageSection}>
              <View style={styles.imagePreviewContainer}>
                <View style={styles.imagePlaceholder}>
                  <Icon name="image" size={50} color="#90a5a0" />
                </View>
                <Text style={styles.imageHint}>Product Image</Text>
              </View>
              <View style={styles.imageUrlContainer}>
                <Icon name="link" size={20} color="#90a5a0" style={styles.imageUrlIcon} />
                <TextInput
                  style={styles.imageUrlInput}
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  placeholder="Enter image URL"
                  placeholderTextColor="#90a5a0"
                />
              </View>
            </View>

            <View style={styles.divider} />

            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              <View style={styles.formGroup}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Product Name</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    validateField('name', text);
                  }}
                  placeholder="Enter product name"
                  placeholderTextColor="#90a5a0"
                />
                {errors.name && (
                  <Text style={styles.errorText}>{errors.name}</Text>
                )}
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.rowItem]}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.label}>SKU</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={sku}
                    onChangeText={setSku}
                    placeholder="SKU"
                    placeholderTextColor="#90a5a0"
                  />
                </View>
                <View style={[styles.formGroup, styles.rowItem]}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.label}>Category</Text>
                    <TouchableOpacity
                      onPress={() => setShowCategoryModal(true)}
                      style={styles.categorySelector}
                    >
                      <Text style={[
                        styles.categorySelectorText,
                        !category && styles.categorySelectorPlaceholder
                      ]}>
                        {getCategoryDisplay()}
                      </Text>
                      <Icon name="arrow-drop-down" size={24} color="#90a5a0" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Pricing Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pricing</Text>
              
              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.rowItem]}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.label}>Purchase Price ($)</Text>
                    <Text style={styles.required}>*</Text>
                  </View>
                  <View style={styles.inputWithIcon}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={[styles.inputWithIconField, errors.purchasePrice && styles.inputError]}
                      value={purchasePrice}
                      onChangeText={(text) => {
                        setPurchasePrice(text);
                        validateField('purchasePrice', text);
                      }}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      placeholderTextColor="#90a5a0"
                    />
                  </View>
                  {errors.purchasePrice && (
                    <Text style={styles.errorText}>{errors.purchasePrice}</Text>
                  )}
                </View>
                <View style={[styles.formGroup, styles.rowItem]}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.label}>Selling Price ($)</Text>
                    <Text style={styles.required}>*</Text>
                  </View>
                  <View style={styles.inputWithIcon}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={[styles.inputWithIconField, errors.sellingPrice && styles.inputError]}
                      value={sellingPrice}
                      onChangeText={(text) => {
                        setSellingPrice(text);
                        validateField('sellingPrice', text);
                      }}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      placeholderTextColor="#90a5a0"
                    />
                  </View>
                  {errors.sellingPrice && (
                    <Text style={styles.errorText}>{errors.sellingPrice}</Text>
                  )}
                </View>
              </View>

              {/* Profit Preview */}
              {(purchasePrice || sellingPrice) && (
                <View style={styles.profitPreview}>
                  <View style={styles.profitCard}>
                    <View style={styles.profitItem}>
                      <Icon name="attach-money" size={20} color="#152d2a" />
                      <Text style={styles.profitLabel}>Profit per unit:</Text>
                      <Text style={[styles.profitValue, { color: getProfitColor() }]}>
                        ${profit.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.profitItem}>
                      <Icon name="trending-up" size={20} color="#152d2a" />
                      <Text style={styles.profitLabel}>Margin:</Text>
                      <Text style={[styles.profitValue, { color: getProfitColor() }]}>
                        {profitMargin.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  {sellingPrice && purchasePrice && parseFloat(sellingPrice) < parseFloat(purchasePrice) && (
                    <View style={styles.warningBanner}>
                      <Icon name="warning" size={20} color="#f44336" />
                      <Text style={styles.warningText}>Loss: Selling below purchase price!</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* Stock */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stock</Text>
              
              <View style={styles.formGroup}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Quantity</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <TextInput
                  style={[styles.input, errors.quantity && styles.inputError]}
                  value={quantity}
                  onChangeText={(text) => {
                    setQuantity(text);
                    validateField('quantity', text);
                  }}
                  placeholder="0"
                  keyboardType="number-pad"
                  placeholderTextColor="#90a5a0"
                />
                {errors.quantity && (
                  <Text style={styles.errorText}>{errors.quantity}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <View style={styles.formGroup}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter product description (optional)"
                  placeholderTextColor="#90a5a0"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>
                  {description.length} characters
                </Text>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#FFF" />
                  <Text style={styles.submitButtonText}>
                    {isEditing ? 'Updating...' : 'Adding...'}
                  </Text>
                </View>
              ) : (
                <>
                  <Icon 
                    name={isEditing ? 'update' : 'add-circle'} 
                    size={24} 
                    color="#FFF" 
                  />
                  <Text style={styles.submitButtonText}>
                    {isEditing ? 'Update Product' : 'Add Product'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => {
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
                            const productRef = ref(database, `products/${product.id}`);
                            await set(productRef, null);
                            Alert.alert('Success', 'Product deleted successfully');
                            navigation.goBack();
                          } catch (error) {
                            Alert.alert('Error', 'Failed to delete product');
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <Icon name="delete" size={20} color="#f44336" />
                <Text style={styles.deleteButtonText}>Delete Product</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CategoryModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#152d2a',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#152d2a',
    borderBottomWidth: 1,
    borderBottomColor: '#90a5a0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  formContainer: {
    padding: 16,
  },
  imageSection: {
    backgroundColor: '#90a5a0',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#178556',
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#152d2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageHint: {
    fontSize: 12,
    color: '#152d2a',
    marginTop: 6,
  },
  imageUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#152d2a',
    paddingHorizontal: 12,
  },
  imageUrlIcon: {
    marginRight: 8,
  },
  imageUrlInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#152d2a',
  },
  divider: {
    height: 1,
    backgroundColor: '#90a5a0',
    marginVertical: 16,
  },
  section: {
    backgroundColor: '#90a5a0',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#178556',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#152d2a',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#152d2a',
  },
  required: {
    color: '#f44336',
    marginLeft: 4,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#152d2a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#152d2a',
    backgroundColor: '#FFF',
  },
  inputError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#152d2a',
    borderRadius: 10,
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#152d2a',
    fontWeight: '600',
    marginRight: 4,
  },
  inputWithIconField: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#152d2a',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowItem: {
    flex: 1,
    marginRight: 8,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    color: '#152d2a',
    textAlign: 'right',
    marginTop: 4,
  },
  profitPreview: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#152d2a',
    paddingTop: 12,
  },
  profitCard: {
    backgroundColor: '#152d2a',
    borderRadius: 8,
    padding: 12,
  },
  profitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profitLabel: {
    fontSize: 13,
    color: '#90a5a0',
    marginLeft: 8,
    flex: 1,
  },
  profitValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    color: '#f44336',
    fontSize: 13,
    marginLeft: 8,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#178556',
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#178556',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#152d2a',
  },
  submitButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  deleteButtonText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#152d2a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'space-between',
    flex: 1,
  },
  categorySelectorText: {
    fontSize: 14,
    color: '#152d2a',
  },
  categorySelectorPlaceholder: {
    color: '#90a5a0',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#90a5a0',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '70%',
    minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#152d2a',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#152d2a',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  modalLoadingText: {
    fontSize: 14,
    color: '#152d2a',
    marginTop: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#152d2a',
  },
  categoryItemSelected: {
    backgroundColor: '#178556',
    borderRadius: 8,
  },
  categoryItemText: {
    fontSize: 15,
    color: '#152d2a',
  },
  categoryItemTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  modalEmptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 14,
    color: '#152d2a',
    marginTop: 8,
  },
  modalAddCategoryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#178556',
    borderRadius: 8,
  },
  modalAddCategoryText: {
    color: '#FFF',
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
    borderTopColor: '#152d2a',
  },
  manageCategoriesText: {
    color: '#152d2a',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});