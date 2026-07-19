import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDatabaseInstance, ref, push, set, update } from '../config/firebase';

const { width, height } = Dimensions.get('window');

const categories = [
  'Electronics', 'Clothing', 'Food & Beverage', 
  'Furniture', 'Tools', 'Accessories', 'Other'
];

const AddEditProductScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { product, isEditing } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sellPrice: product?.sellPrice?.toString() || product?.price?.toString() || '',
    buyPrice: product?.buyPrice?.toString() || product?.cost?.toString() || '',
    category: product?.category || '',
    quantity: product?.quantity?.toString() || '',
    description: product?.description || '',
    sku: product?.sku || '',
    supplier: product?.supplier || ''
  });

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const calculateProfit = () => {
    const price = parseFloat(formData.sellPrice) || 0;
    const cost = parseFloat(formData.buyPrice) || 0;
    return (price - cost).toFixed(2);
  };

  const calculateMargin = () => {
    const price = parseFloat(formData.sellPrice) || 0;
    const cost = parseFloat(formData.buyPrice) || 0;
    if (price === 0) return '0%';
    return `${((price - cost) / price * 100).toFixed(1)}%`;
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter product name');
      return false;
    }
    if (!formData.sellPrice || parseFloat(formData.sellPrice) <= 0) {
      Alert.alert('Error', 'Please enter a valid selling price');
      return false;
    }
    if (!formData.buyPrice || parseFloat(formData.buyPrice) <= 0) {
      Alert.alert('Error', 'Please enter a valid cost price');
      return false;
    }
    if (!formData.category) {
      Alert.alert('Error', 'Please select a category');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const db = getDatabaseInstance();
      const productData = {
        name: formData.name.trim(),
        sellPrice: parseFloat(formData.sellPrice),
        buyPrice: parseFloat(formData.buyPrice),
        category: formData.category,
        quantity: parseInt(formData.quantity) || 0,
        description: formData.description.trim(),
        sku: formData.sku.trim(),
        supplier: formData.supplier.trim(),
        updatedAt: new Date().toISOString()
      };

      if (isEditing && product?.id) {
        const productRef = ref(db, `products/${product.id}`);
        await update(productRef, productData);
        Alert.alert('Success', 'Product updated successfully');
      } else {
        const productsRef = ref(db, 'products');
        const newProductRef = push(productsRef);
        await set(newProductRef, {
          ...productData,
          createdAt: new Date().toISOString(),
          id: newProductRef.key
        });
        Alert.alert('Success', 'Product added successfully');
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 40 + insets.bottom }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-back" size={22} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {isEditing ? 'Edit Product' : 'New Product'}
              </Text>
            </View>
            <View style={styles.headerBadge}>
              <Icon name={isEditing ? "create-outline" : "add-circle-outline"} size={22} color="#0D5335" />
            </View>
          </View>

          <View style={styles.form}>
            {/* Product Name */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Product Name</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <View style={styles.inputWrapper}>
                <Icon name="cube-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => handleInputChange('name', text)}
                  placeholder="Enter product name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Product Description (formerly SKU) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Description</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.sku}
                  onChangeText={(text) => handleInputChange('sku', text)}
                  placeholder="Enter product description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* Price Row */}
            <View style={styles.row}>
              <View style={[styles.halfWidth, styles.inputGroup]}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Selling Price</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    value={formData.sellPrice}
                    onChangeText={(text) => handleInputChange('sellPrice', text)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
              
              <View style={[styles.halfWidth, styles.inputGroup]}>
                <View style={styles.labelContainer}>
                  <Text style={styles.label}>Cost Price</Text>
                  <Text style={styles.required}>*</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    value={formData.buyPrice}
                    onChangeText={(text) => handleInputChange('buyPrice', text)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>

            {/* Profit Stats */}
            {formData.sellPrice && formData.buyPrice && (
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Icon name="trending-up" size={16} color="#0D5335" />
                  <Text style={styles.statLabel}>Profit</Text>
                  <Text style={styles.statValue}>${calculateProfit()}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Icon name="pie-chart" size={16} color="#0D5335" />
                  <Text style={styles.statLabel}>Margin</Text>
                  <Text style={styles.statValue}>{calculateMargin()}</Text>
                </View>
              </View>
            )}

            {/* Category */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Text style={styles.label}>Category</Text>
                <Text style={styles.required}>*</Text>
              </View>
              <View style={styles.categoryContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      formData.category === cat && styles.categoryButtonActive
                    ]}
                    onPress={() => handleInputChange('category', cat)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      formData.category === cat && styles.categoryButtonTextActive
                    ]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quantity */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Initial Quantity</Text>
              <View style={styles.inputWrapper}>
                <Icon name="layers-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.quantity}
                  onChangeText={(text) => handleInputChange('quantity', text)}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Supplier */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Supplier</Text>
              <View style={styles.inputWrapper}>
                <Icon name="business-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.supplier}
                  onChangeText={(text) => handleInputChange('supplier', text)}
                  placeholder="Enter supplier name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Additional Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Additional Notes</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => handleInputChange('description', text)}
                  placeholder="Add any additional notes about this product"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Icon name={isEditing ? "checkmark-circle" : "add-circle"} size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>
                    {isEditing ? 'Update Product' : 'Add Product'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0D533515',
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  required: {
    color: '#EF4444',
    fontSize: 14,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    overflow: 'hidden',
  },
  inputIcon: {
    paddingLeft: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#111827',
  },
  currencySymbol: {
    paddingLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  priceInput: {
    paddingLeft: 4,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    height: 90,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  categoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryButtonActive: {
    backgroundColor: '#0D5335',
    borderColor: '#0D5335',
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0D5335',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#D1D5DB',
  },
  saveButton: {
    backgroundColor: '#0D5335',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 10,
    gap: 6,
    shadowColor: '#0D5335',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AddEditProductScreen;