import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { database } from '../config/firebase';
import { ref, set, update, push } from 'firebase/database';

export default function AddEditProductScreen({ route, navigation }) {
  const product = route.params?.product;
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [quantity, setQuantity] = useState(product?.quantity?.toString() || '');
  const [category, setCategory] = useState(product?.category || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');

  const handleSubmit = async () => {
    // Validate required fields
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Product name is required');
      return;
    }
    
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return;
    }
    
    if (!quantity || isNaN(parseInt(quantity)) || parseInt(quantity) < 0) {
      Alert.alert('Validation Error', 'Please enter a valid quantity');
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
      if (product) {
        // Update existing product
        const productRef = ref(database, `products/${product.id}`);
        await update(productRef, productData);
        Alert.alert('Success', 'Product updated successfully');
      } else {
        // Add new product
        productData.createdAt = new Date().toISOString();
        const productsRef = ref(database, 'products');
        const newProductRef = push(productsRef);
        await set(newProductRef, productData);
        Alert.alert('Success', 'Product added successfully');
      }
      
      navigation.goBack();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert(
        'Error', 
        `Failed to save product: ${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter product name"
        />

        <Text style={styles.label}>SKU</Text>
        <TextInput
          style={styles.input}
          value={sku}
          onChangeText={setSku}
          placeholder="Enter SKU (optional)"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter product description (optional)"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Price *</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="Enter price"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Quantity *</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Enter quantity in stock"
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholder="Enter category (optional)"
        />

        <Text style={styles.label}>Image URL</Text>
        <TextInput
          style={styles.input}
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="Enter image URL (optional)"
        />

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>
              {product ? 'Update Product' : 'Add Product'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: 'white',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#ff6b00',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});