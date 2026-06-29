import React, { useState } from 'react';
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
} from 'react-native';
import { database } from '../config/firebase';
import { ref, set, update, push } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

export default function AddEditProductScreen({ route, navigation }) {
  const product = route.params?.product;
  const isEditing = !!product;
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [quantity, setQuantity] = useState(product?.quantity?.toString() || '');
  const [category, setCategory] = useState(product?.category || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [errors, setErrors] = useState({});

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
      case 'price':
        if (!value || isNaN(parseFloat(value)) || parseFloat(value) < 0) {
          newErrors.price = 'Please enter a valid price';
        } else {
          delete newErrors.price;
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
    // Validate all fields
    validateField('name', name);
    validateField('price', price);
    validateField('quantity', quantity);

    if (!name.trim() || !price || !quantity) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    if (Object.keys(errors).length > 0) {
      Alert.alert('Validation Error', 'Please fix all errors before submitting');
      return;
    }

    setLoading(true);

    const productData = {
      name: name.trim(),
      description: description.trim(),
      category: category.trim() || 'Uncategorized',
      sku: sku.trim() || '',
      imageUrl: imageUrl.trim() || 'https://via.placeholder.com/300',
      price: parseFloat(price),
      quantity: parseInt(quantity),
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
            <Icon name="arrow-back" size={24} color="#1a1a2e" />
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
                  <Icon name="image" size={50} color="#ccc" />
                </View>
                <Text style={styles.imageHint}>Product Image</Text>
              </View>
              <View style={styles.imageUrlContainer}>
                <Icon name="link" size={20} color="#999" style={styles.imageUrlIcon} />
                <TextInput
                  style={styles.imageUrlInput}
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  placeholder="Enter image URL"
                  placeholderTextColor="#999"
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
                  placeholderTextColor="#999"
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
                    placeholderTextColor="#999"
                  />
                </View>
                <View style={[styles.formGroup, styles.rowItem]}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.label}>Category</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={category}
                    onChangeText={setCategory}
                    placeholder="Category"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Pricing & Stock */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pricing & Stock</Text>
              
              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.rowItem]}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.label}>Price ($)</Text>
                    <Text style={styles.required}>*</Text>
                  </View>
                  <View style={styles.inputWithIcon}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={[styles.inputWithIconField, errors.price && styles.inputError]}
                      value={price}
                      onChangeText={(text) => {
                        setPrice(text);
                        validateField('price', text);
                      }}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      placeholderTextColor="#999"
                    />
                  </View>
                  {errors.price && (
                    <Text style={styles.errorText}>{errors.price}</Text>
                  )}
                </View>
                <View style={[styles.formGroup, styles.rowItem]}>
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
                    placeholderTextColor="#999"
                  />
                  {errors.quantity && (
                    <Text style={styles.errorText}>{errors.quantity}</Text>
                  )}
                </View>
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
                  placeholderTextColor="#999"
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
                  <ActivityIndicator color="white" />
                  <Text style={styles.submitButtonText}>
                    {isEditing ? 'Updating...' : 'Adding...'}
                  </Text>
                </View>
              ) : (
                <>
                  <Icon 
                    name={isEditing ? 'update' : 'add-circle'} 
                    size={24} 
                    color="white" 
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  imageUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
  },
  imageUrlIcon: {
    marginRight: 8,
  },
  imageUrlInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
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
    color: '#333',
  },
  required: {
    color: '#f44336',
    marginLeft: 4,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fafafa',
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
    borderColor: '#e0e0e0',
    borderRadius: 10,
    backgroundColor: '#fafafa',
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    marginRight: 4,
  },
  inputWithIconField: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
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
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#ff6b00',
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#ff6b00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: 'white',
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
});