import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDatabaseInstance, ref, onValue, push, set, remove, update } from '../config/firebase';

const { width, height } = Dimensions.get('window');

const CategoryManagementScreen = () => {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [productCount, setProductCount] = useState({});

  useEffect(() => {
    loadCategories();
    loadProductCategories();
  }, []);

  const loadCategories = () => {
    const db = getDatabaseInstance();
    const categoriesRef = ref(db, 'categories');
    onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      const categoriesList = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      setCategories(categoriesList);
      setLoading(false);
      setRefreshing(false);
    });
  };

  const loadProductCategories = () => {
    const db = getDatabaseInstance();
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const products = data ? Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })) : [];
      
      const counts = {};
      products.forEach(product => {
        if (product.category) {
          counts[product.category] = (counts[product.category] || 0) + 1;
        }
      });
      setProductCount(counts);
    });
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    if (categories.some(cat => cat.name.toLowerCase() === categoryName.trim().toLowerCase())) {
      Alert.alert('Error', 'Category already exists');
      return;
    }

    setLoading(true);
    try {
      const db = getDatabaseInstance();
      const categoriesRef = ref(db, 'categories');
      const newCategoryRef = push(categoriesRef);
      
      const categoryData = {
        name: categoryName.trim(),
        description: categoryDescription.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        id: newCategoryRef.key
      };
      
      await set(newCategoryRef, categoryData);
      Alert.alert('Success', 'Category added successfully');
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      Alert.alert('Error', 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    if (categories.some(cat => cat.id !== editingCategory.id && 
        cat.name.toLowerCase() === categoryName.trim().toLowerCase())) {
      Alert.alert('Error', 'Category already exists');
      return;
    }

    setLoading(true);
    try {
      const db = getDatabaseInstance();
      const categoryRef = ref(db, `categories/${editingCategory.id}`);
      
      const categoryData = {
        name: categoryName.trim(),
        description: categoryDescription.trim(),
        updatedAt: new Date().toISOString()
      };
      
      await update(categoryRef, categoryData);
      Alert.alert('Success', 'Category updated successfully');
      resetForm();
      loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      Alert.alert('Error', 'Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = (category) => {
    const productCountInCategory = productCount[category.name] || 0;
    
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?\n\n${productCountInCategory} product(s) are using this category. Deleting will remove the category assignment from these products.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const db = getDatabaseInstance();
              const categoryRef = ref(db, `categories/${category.id}`);
              await remove(categoryRef);
              
              const productsRef = ref(db, 'products');
              onValue(productsRef, async (snapshot) => {
                const data = snapshot.val();
                if (data) {
                  for (const [productId, product] of Object.entries(data)) {
                    if (product.category === category.name) {
                      const productRef = ref(db, `products/${productId}`);
                      await update(productRef, { category: 'Other' });
                    }
                  }
                }
              }, { onlyOnce: true });
              
              Alert.alert('Success', 'Category deleted successfully');
              loadCategories();
              loadProductCategories();
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert('Error', 'Failed to delete category');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setModalVisible(false);
  };

  const getCategoryColor = (index) => {
    const colors = ['#0D5335', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B'];
    return colors[index % colors.length];
  };

  const renderCategoryItem = ({ item, index }) => {
    const count = productCount[item.name] || 0;
    const color = getCategoryColor(index);
    
    return (
      <View style={styles.categoryCard}>
        <View style={styles.categoryInfo}>
          <View style={[styles.categoryIconContainer, { backgroundColor: color + '15' }]}>
            <Icon name="folder-open-outline" size={22} color={color} />
          </View>
          <View style={styles.categoryDetails}>
            <Text style={styles.categoryName}>{item.name}</Text>
            {item.description ? (
              <View style={styles.descriptionContainer}>
                <Icon name="document-text-outline" size={11} color="#6B7280" />
                <Text style={styles.categoryDescription} numberOfLines={1}>
                  {item.description}
                </Text>
              </View>
            ) : null}
            <View style={styles.productCountContainer}>
              <Icon name="cube-outline" size={11} color="#6B7280" />
              <Text style={styles.productCount}>
                {count} product{count !== 1 ? 's' : ''}
              </Text>
              {count > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{count}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.categoryActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.editBtn]}
            onPress={() => handleEditCategory(item)}
            activeOpacity={0.7}
          >
            <Icon name="create-outline" size={15} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDeleteCategory(item)}
            activeOpacity={0.7}
          >
            <Icon name="trash-outline" size={15} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Fixed Header Component
  const FixedHeader = () => (
    <View style={[styles.fixedHeaderContainer, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>
            {categories.length} categories • {Object.values(productCount).reduce((a, b) => a + b, 0)} products
          </Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={loadCategories}>
          <Icon name="refresh-outline" size={20} color="#0D5335" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, styles.totalIcon]}>
            <Icon name="albums-outline" size={18} color="#0D5335" />
          </View>
          <Text style={styles.statValue}>{categories.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, styles.activeIcon]}>
            <Icon name="checkmark-circle-outline" size={18} color="#10B981" />
          </View>
          <Text style={styles.statValue}>{Object.keys(productCount).length}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, styles.productIcon]}>
            <Icon name="cube-outline" size={18} color="#3B82F6" />
          </View>
          <Text style={styles.statValue}>{Object.values(productCount).reduce((a, b) => a + b, 0)}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
      </View>
    </View>
  );

  if (loading && categories.length === 0) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
        <ActivityIndicator size="large" color="#0D5335" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <FixedHeader />

      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={loadCategories}
            colors={['#0D5335']}
            tintColor="#0D5335"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="folder-open-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyText}>No categories found</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first category</Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: 80 + insets.bottom }
        ]}
        showsVerticalScrollIndicator={false}
        style={styles.flatList}
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <Icon name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={resetForm}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <Icon 
                  name={editingCategory ? "create-outline" : "add-circle-outline"} 
                  size={22} 
                  color="#FFFFFF" 
                />
                <Text style={styles.modalTitle}>
                  {editingCategory ? 'Edit Category' : 'New Category'}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={resetForm}
              >
                <Icon name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category Name</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="pricetag-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={categoryName}
                    onChangeText={setCategoryName}
                    placeholder="Enter category name"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={categoryDescription}
                    onChangeText={setCategoryDescription}
                    placeholder="Enter category description"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={editingCategory ? handleUpdateCategory : handleAddCategory}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>
                      {editingCategory ? 'Update Category' : 'Add Category'}
                    </Text>
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
  fixedHeaderContainer: {
    backgroundColor: '#F3F4F6',
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  headerAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0D533515',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0D533530',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  totalIcon: {
    backgroundColor: '#0D533515',
  },
  activeIcon: {
    backgroundColor: '#10B98115',
  },
  productIcon: {
    backgroundColor: '#3B82F615',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 1,
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 3,
  },
  categoryDescription: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
  productCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  productCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  countBadge: {
    backgroundColor: '#0D533515',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 9,
    color: '#0D5335',
    fontWeight: '600',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: '#0D5335',
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0D5335',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#0D5335',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
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
    backgroundColor: '#0D5335',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalForm: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  textAreaWrapper: {
    alignItems: 'flex-start',
    height: 90,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  saveButton: {
    backgroundColor: '#0D5335',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
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
    fontSize: 15,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
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

export default CategoryManagementScreen;