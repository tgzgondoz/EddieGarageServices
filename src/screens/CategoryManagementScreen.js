// screens/CategoryManagementScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  SafeAreaView,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { database } from '../config/firebase';
import { ref, onValue, off, push, set, remove, update } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function CategoryManagementScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [totalProducts, setTotalProducts] = useState(0);
  
  // Refs
  const inputRef = useRef(null);
  const editInputRef = useRef(null);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(-30))[0];
  const errorAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const categoriesRef = ref(database, 'categories');
    const productsRef = ref(database, 'products');
    
    // Fetch categories
    const unsubscribeCategories = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const categoriesData = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        // Sort categories alphabetically
        categoriesData.sort((a, b) => a.name.localeCompare(b.name));
        setCategories(categoriesData);
      } else {
        setCategories([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to fetch categories');
      setLoading(false);
    });

    // Fetch products to count categories
    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const products = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setTotalProducts(products.length);
        
        // Update product counts for each category
        const categoryCounts = {};
        products.forEach(product => {
          let categoryName = '';
          if (product.category) {
            if (typeof product.category === 'object') {
              categoryName = product.category.name || product.category.value || String(product.category);
            } else {
              categoryName = String(product.category);
            }
          }
          if (categoryName && categoryName.trim() !== '') {
            categoryName = categoryName.trim();
            categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
          }
        });

        // Update categories with product counts
        setCategories(prevCategories => {
          return prevCategories.map(cat => ({
            ...cat,
            productCount: categoryCounts[cat.name] || 0
          }));
        });
      } else {
        setTotalProducts(0);
        // Reset product counts
        setCategories(prevCategories => {
          return prevCategories.map(cat => ({
            ...cat,
            productCount: 0
          }));
        });
      }
    });

    return () => {
      off(categoriesRef);
      off(productsRef);
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Animate error message
  useEffect(() => {
    if (errorMessage) {
      Animated.sequence([
        Animated.timing(errorAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(errorAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setErrorMessage(''));
    }
  }, [errorMessage]);

  const validateCategoryName = (name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a category name');
      return null;
    }
    if (trimmed.length < 2) {
      setErrorMessage('Category name must be at least 2 characters');
      return null;
    }
    if (trimmed.length > 30) {
      setErrorMessage('Category name must be less than 30 characters');
      return null;
    }
    return trimmed;
  };

  const isDuplicateCategory = (name, excludeId = null) => {
    const trimmed = name.trim().toLowerCase();
    return categories.some(cat => 
      cat.id !== excludeId && 
      cat.name.toLowerCase() === trimmed
    );
  };

  const addCategory = async () => {
    // Validate name
    const name = validateCategoryName(newCategoryName);
    if (!name) {
      inputRef.current?.focus();
      return;
    }

    // Check for duplicate
    if (isDuplicateCategory(name)) {
      setErrorMessage(`Category "${name}" already exists`);
      inputRef.current?.focus();
      return;
    }

    setIsAddingCategory(true);
    try {
      const categoriesRef = ref(database, 'categories');
      const newCategoryRef = push(categoriesRef);
      await set(newCategoryRef, {
        name: name,
        createdAt: new Date().toISOString(),
        productCount: 0
      });
      
      setNewCategoryName('');
      setErrorMessage('');
      inputRef.current?.focus();
      
      Alert.alert('Success', `Category "${name}" added successfully`);
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to add category. Please try again.');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const deleteCategory = async (category) => {
    // Check if category has products
    if (category.productCount > 0) {
      Alert.alert(
        'Category In Use',
        `"${category.name}" has ${category.productCount} product(s) associated with it. Please reassign or delete those products first.`,
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const categoryRef = ref(database, `categories/${category.id}`);
      await remove(categoryRef);
      Alert.alert('Success', `Category "${category.name}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting category:', error);
      Alert.alert('Error', 'Failed to delete category');
    }
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setEditingName(category.name);
    setErrorMessage('');
    setShowEditModal(true);
    setTimeout(() => editInputRef.current?.focus(), 300);
  };

  const updateCategory = async () => {
    const name = validateCategoryName(editingName);
    if (!name) {
      editInputRef.current?.focus();
      return;
    }

    if (isDuplicateCategory(name, editingCategory.id)) {
      setErrorMessage(`Category "${name}" already exists`);
      editInputRef.current?.focus();
      return;
    }

    try {
      const categoryRef = ref(database, `categories/${editingCategory.id}`);
      await update(categoryRef, {
        name: name,
        updatedAt: new Date().toISOString()
      });
      
      setShowEditModal(false);
      setEditingCategory(null);
      setEditingName('');
      setErrorMessage('');
      Alert.alert('Success', `Category updated to "${name}" successfully`);
    } catch (error) {
      console.error('Error updating category:', error);
      Alert.alert('Error', 'Failed to update category');
    }
  };

  const getCategoryColor = (index) => {
    const colors = ['#178556', '#2196F3', '#4CAF50', '#9C27B0', '#FF9800', '#E91E63', '#00BCD4'];
    return colors[index % colors.length];
  };

  const renderCategory = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.categoryCard,
        { 
          opacity: fadeAnim, 
          borderLeftColor: getCategoryColor(index),
          transform: [{ translateX: slideAnim }],
        }
      ]}
    >
      <TouchableOpacity
        style={styles.categoryContent}
        onPress={() => openEditModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryInfo}>
          <View style={[styles.categoryColorDot, { backgroundColor: getCategoryColor(index) }]} />
          <View style={styles.categoryNameContainer}>
            <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.productCountBadge}>
              <Icon name="inventory-2" size={12} color="#152d2a" />
              <Text style={styles.productCountText}>
                {item.productCount || 0} {item.productCount === 1 ? 'product' : 'products'}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Icon name="edit" size={20} color="#152d2a" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setCategoryToDelete(item);
              setShowDeleteModal(true);
            }}
          >
            <Icon name="delete" size={20} color="#f44336" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // Delete Confirmation Modal
  const DeleteModal = () => (
    <Modal
      visible={showDeleteModal}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalIconContainer}>
            <Icon name="warning" size={50} color="#f44336" />
          </View>
          <Text style={styles.modalTitle}>Delete Category</Text>
          <Text style={styles.modalText}>
            Are you sure you want to delete "{categoryToDelete?.name}"?
          </Text>
          {categoryToDelete?.productCount > 0 && (
            <View style={styles.modalWarningContainer}>
              <Icon name="error-outline" size={20} color="#f44336" />
              <Text style={styles.modalWarningText}>
                This category has {categoryToDelete.productCount} product(s) associated with it.
              </Text>
            </View>
          )}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={() => setShowDeleteModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton, 
                categoryToDelete?.productCount > 0 ? styles.modalDisabledButton : styles.modalDeleteButton
              ]}
              onPress={() => {
                setShowDeleteModal(false);
                deleteCategory(categoryToDelete);
              }}
              disabled={categoryToDelete?.productCount > 0}
            >
              <Text style={categoryToDelete?.productCount > 0 ? styles.modalDisabledText : styles.modalDeleteText}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Edit Modal
  const EditModal = () => (
    <Modal
      visible={showEditModal}
      transparent={true}
      animationType="slide"
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.editModalContent}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>Edit Category</Text>
            <TouchableOpacity
              onPress={() => {
                setShowEditModal(false);
                setEditingCategory(null);
                setEditingName('');
                setErrorMessage('');
              }}
              style={styles.modalCloseButton}
            >
              <Icon name="close" size={24} color="#152d2a" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.editInputWrapper}>
            <TextInput
              ref={editInputRef}
              style={[styles.editInput, errorMessage && styles.editInputError]}
              value={editingName}
              onChangeText={(text) => {
                setEditingName(text);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Enter category name"
              placeholderTextColor="#152d2a"
              autoFocus
              onSubmitEditing={updateCategory}
              maxLength={30}
            />
            {errorMessage ? (
              <Animated.Text style={[styles.errorText, { opacity: errorAnim }]}>
                {errorMessage}
              </Animated.Text>
            ) : (
              <Text style={styles.charCount}>{editingName.length}/30</Text>
            )}
          </View>

          {editingCategory && (
            <View style={styles.editCategoryInfo}>
              <View style={styles.editInfoRow}>
                <Icon name="inventory-2" size={16} color="#152d2a" />
                <Text style={styles.editInfoText}>
                  {editingCategory.productCount || 0} products in this category
                </Text>
              </View>
              {editingCategory.createdAt && (
                <View style={styles.editInfoRow}>
                  <Icon name="calendar-today" size={16} color="#152d2a" />
                  <Text style={styles.editInfoText}>
                    Created: {new Date(editingCategory.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.editModalButtons}>
            <TouchableOpacity
              style={[styles.editModalButton, styles.editCancelButton]}
              onPress={() => {
                setShowEditModal(false);
                setEditingCategory(null);
                setEditingName('');
                setErrorMessage('');
              }}
            >
              <Text style={styles.editCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editModalButton, styles.editSaveButton]}
              onPress={updateCategory}
            >
              <Icon name="save" size={20} color="#FFFFFF" />
              <Text style={styles.editSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const handleClearInput = () => {
    setNewCategoryName('');
    setErrorMessage('');
    inputRef.current?.focus();
  };

  if (loading && categories.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <TouchableOpacity 
          onPress={() => {
            const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));
            setCategories(sorted);
          }}
          style={styles.sortButton}
        >
          <Icon name="sort" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <View style={[styles.inputWrapper, errorMessage && styles.inputWrapperError]}>
          <Icon name="category" size={20} color="#152d2a" style={styles.inputIcon} />
          <TextInput
            ref={inputRef}
            style={[styles.input, errorMessage && styles.inputError]}
            placeholder="Enter new category name"
            placeholderTextColor="#152d2a"
            value={newCategoryName}
            onChangeText={(text) => {
              setNewCategoryName(text);
              if (errorMessage) setErrorMessage('');
            }}
            onSubmitEditing={addCategory}
            maxLength={30}
            editable={!isAddingCategory}
          />
          {newCategoryName.length > 0 && (
            <TouchableOpacity 
              onPress={handleClearInput}
              style={styles.clearInputButton}
            >
              <Icon name="close" size={18} color="#152d2a" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={[
            styles.addButton, 
            (!newCategoryName.trim() || isAddingCategory) && styles.addButtonDisabled
          ]}
          onPress={addCategory}
          disabled={!newCategoryName.trim() || isAddingCategory}
        >
          {isAddingCategory ? (
            <View style={styles.addingSpinner} />
          ) : (
            <Icon name="add" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {errorMessage ? (
        <Animated.View style={[styles.errorContainer, { opacity: errorAnim }]}>
          <Icon name="error-outline" size={18} color="#f44336" />
          <Text style={styles.errorContainerText}>{errorMessage}</Text>
        </Animated.View>
      ) : (
        <View style={styles.categoryCount}>
          <Text style={styles.categoryCountText}>
            {categories.length} {categories.length === 1 ? 'category' : 'categories'} · {totalProducts} total products
          </Text>
          {categories.length > 0 && (
            <Text style={styles.categoryCountHint}>
              Tap a category to edit
            </Text>
          )}
        </View>
      )}

      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="category" size={60} color="#90a5a0" />
            <Text style={styles.emptyTitle}>No Categories</Text>
            <Text style={styles.emptySubtitle}>
              Start by adding your first category above
            </Text>
          </View>
        }
      />

      <EditModal />
      <DeleteModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#152d2a',
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
    borderColor: '#178556',
    borderTopColor: 'transparent',
    marginBottom: 12,
  },
  addingSpinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderTopColor: 'transparent',
  },
  loadingText: {
    fontSize: 16,
    color: '#90a5a0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#178556',
    borderBottomWidth: 1,
    borderBottomColor: '#152d2a',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sortButton: {
    padding: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#90a5a0',
    borderBottomWidth: 1,
    borderBottomColor: '#152d2a',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#152d2a',
  },
  inputWrapperError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#152d2a',
  },
  inputError: {
    color: '#f44336',
  },
  clearInputButton: {
    padding: 4,
  },
  addButton: {
    backgroundColor: '#178556',
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#178556',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#152d2a',
  },
  addButtonDisabled: {
    backgroundColor: '#90a5a0',
    shadowOpacity: 0,
    elevation: 0,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFEBEE',
  },
  errorContainerText: {
    fontSize: 13,
    color: '#f44336',
    marginLeft: 6,
  },
  categoryCount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#90a5a0',
    borderBottomWidth: 1,
    borderBottomColor: '#152d2a',
  },
  categoryCountText: {
    fontSize: 12,
    color: '#152d2a',
    fontWeight: '500',
  },
  categoryCountHint: {
    fontSize: 11,
    color: '#152d2a',
  },
  list: {
    padding: 12,
    paddingBottom: 20,
  },
  categoryCard: {
    backgroundColor: '#90a5a0',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#178556',
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  categoryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  categoryNameContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#152d2a',
  },
  productCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  productCountText: {
    fontSize: 11,
    color: '#152d2a',
    marginLeft: 4,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 6,
    marginLeft: 4,
  },
  emptyContainer: {
    padding: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#90a5a0',
    marginTop: 4,
    textAlign: 'center',
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
    backgroundColor: '#90a5a0',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#178556',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#152d2a',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#152d2a',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  modalWarningText: {
    fontSize: 13,
    color: '#f44336',
    marginLeft: 8,
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#152d2a',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#90a5a0',
  },
  modalDeleteButton: {
    backgroundColor: '#f44336',
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalDisabledButton: {
    backgroundColor: '#90a5a0',
  },
  modalDisabledText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#152d2a',
  },
  // Edit Modal
  editModalContent: {
    backgroundColor: '#90a5a0',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#178556',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#152d2a',
  },
  modalCloseButton: {
    padding: 4,
  },
  editInputWrapper: {
    marginBottom: 16,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#152d2a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#152d2a',
    backgroundColor: '#FFFFFF',
  },
  editInputError: {
    borderColor: '#f44336',
    borderWidth: 2,
  },
  charCount: {
    fontSize: 11,
    color: '#152d2a',
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
  },
  editCategoryInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  editInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  editInfoText: {
    fontSize: 13,
    color: '#152d2a',
    marginLeft: 8,
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  editCancelButton: {
    backgroundColor: '#152d2a',
  },
  editCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#90a5a0',
  },
  editSaveButton: {
    backgroundColor: '#178556',
  },
  editSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});