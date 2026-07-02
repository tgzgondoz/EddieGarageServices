// screens/CategoryManagementScreen.js
import React, { useState, useEffect } from 'react';
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

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const categoriesRef = ref(database, 'categories');
    
    const unsubscribe = onValue(categoriesRef, (snapshot) => {
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

    return () => off(categoriesRef);
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    // Check for duplicate
    if (categories.some(cat => cat.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Error', 'Category already exists');
      return;
    }

    try {
      const categoriesRef = ref(database, 'categories');
      const newCategoryRef = push(categoriesRef);
      await set(newCategoryRef, {
        name: name,
        createdAt: new Date().toISOString(),
        productCount: 0
      });
      setNewCategoryName('');
      Alert.alert('Success', 'Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to add category');
    }
  };

  const deleteCategory = async (category) => {
    try {
      // Check if category is being used by any product
      const productsRef = ref(database, 'products');
      const productsSnapshot = await new Promise((resolve) => {
        onValue(productsRef, (snapshot) => {
          resolve(snapshot);
        }, { onlyOnce: true });
      });
      
      const productsData = productsSnapshot.val();
      let isUsed = false;
      if (productsData) {
        const products = Object.keys(productsData).map(key => ({
          id: key,
          ...productsData[key]
        }));
        isUsed = products.some(p => {
          const cat = typeof p.category === 'object' 
            ? p.category.name || p.category.value || String(p.category)
            : String(p.category || '');
          return cat.toLowerCase() === category.name.toLowerCase();
        });
      }

      if (isUsed) {
        Alert.alert(
          'Category In Use',
          `"${category.name}" is being used by some products. Please reassign or delete those products first.`,
          [{ text: 'OK' }]
        );
        return;
      }

      const categoryRef = ref(database, `categories/${category.id}`);
      await remove(categoryRef);
      Alert.alert('Success', 'Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      Alert.alert('Error', 'Failed to delete category');
    }
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setEditingName(category.name);
    setShowEditModal(true);
  };

  const updateCategory = async () => {
    const name = editingName.trim();
    if (!name) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    // Check for duplicate (excluding current category)
    if (categories.some(cat => 
      cat.id !== editingCategory.id && 
      cat.name.toLowerCase() === name.toLowerCase()
    )) {
      Alert.alert('Error', 'Category name already exists');
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
      Alert.alert('Success', 'Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      Alert.alert('Error', 'Failed to update category');
    }
  };

  const getCategoryColor = (index) => {
    const colors = ['#FF6B00', '#2196F3', '#4CAF50', '#9C27B0', '#FF9800', '#E91E63', '#00BCD4'];
    return colors[index % colors.length];
  };

  const renderCategory = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.categoryCard,
        { opacity: fadeAnim, borderLeftColor: getCategoryColor(index) }
      ]}
    >
      <TouchableOpacity
        style={styles.categoryContent}
        onPress={() => openEditModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryInfo}>
          <View style={[styles.categoryColorDot, { backgroundColor: getCategoryColor(index) }]} />
          <View>
            <Text style={styles.categoryName}>{item.name}</Text>
            <Text style={styles.categorySubtext}>
              {item.productCount || 0} products
            </Text>
          </View>
        </View>
        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(item)}
          >
            <Icon name="edit" size={20} color="#4CAF50" />
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
            {categoryToDelete?.productCount > 0 && (
              <Text style={styles.modalWarning}>
                \nThis category has {categoryToDelete.productCount} products associated with it.
              </Text>
            )}
          </Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={() => setShowDeleteModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalDeleteButton]}
              onPress={() => {
                setShowDeleteModal(false);
                deleteCategory(categoryToDelete);
              }}
            >
              <Text style={styles.modalDeleteText}>Delete</Text>
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
      <View style={styles.modalOverlay}>
        <View style={styles.editModalContent}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>Edit Category</Text>
            <TouchableOpacity
              onPress={() => {
                setShowEditModal(false);
                setEditingCategory(null);
                setEditingName('');
              }}
              style={styles.modalCloseButton}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.editInput}
            value={editingName}
            onChangeText={setEditingName}
            placeholder="Enter category name"
            placeholderTextColor="#999"
            autoFocus
            onSubmitEditing={updateCategory}
          />
          <View style={styles.editModalButtons}>
            <TouchableOpacity
              style={[styles.editModalButton, styles.editCancelButton]}
              onPress={() => {
                setShowEditModal(false);
                setEditingCategory(null);
                setEditingName('');
              }}
            >
              <Text style={styles.editCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editModalButton, styles.editSaveButton]}
              onPress={updateCategory}
            >
              <Icon name="save" size={20} color="white" />
              <Text style={styles.editSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
          <Icon name="arrow-back" size={24} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Categories</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <Icon name="category" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter new category name"
            placeholderTextColor="#999"
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            onSubmitEditing={addCategory}
          />
          {newCategoryName.length > 0 && (
            <TouchableOpacity 
              onPress={() => setNewCategoryName('')}
              style={styles.clearInputButton}
            >
              <Icon name="close" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.addButton, !newCategoryName.trim() && styles.addButtonDisabled]}
          onPress={addCategory}
          disabled={!newCategoryName.trim()}
        >
          <Icon name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.categoryCount}>
        <Text style={styles.categoryCountText}>
          {categories.length} {categories.length === 1 ? 'category' : 'categories'}
        </Text>
      </View>

      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="category" size={60} color="#ddd" />
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
  loadingText: {
    fontSize: 16,
    color: '#666',
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
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  clearInputButton: {
    padding: 4,
  },
  addButton: {
    backgroundColor: '#ff6b00',
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff6b00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  categoryCount: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryCountText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  list: {
    padding: 12,
    paddingBottom: 20,
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
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
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  categorySubtext: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
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
    color: '#666',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
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
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalWarning: {
    color: '#f44336',
    fontWeight: '500',
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
    backgroundColor: '#f5f5f5',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalDeleteButton: {
    backgroundColor: '#f44336',
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  // Edit Modal
  editModalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
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
    color: '#1a1a2e',
  },
  modalCloseButton: {
    padding: 4,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fafafa',
    marginBottom: 16,
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
    backgroundColor: '#f5f5f5',
  },
  editCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  editSaveButton: {
    backgroundColor: '#ff6b00',
  },
  editSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});