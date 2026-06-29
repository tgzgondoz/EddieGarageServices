import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList
} from 'react-native';
import { database } from '../config/firebase';
import { ref, onValue, off, query, orderByChild, limitToLast } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboardScreen({ navigation }) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    totalSales: 0,
    revenue: 0,
    totalUsers: 0
  });
  const [recentSales, setRecentSales] = useState([]);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { userData, usersList, loadUsersList, updateUserRole, deleteUser } = useAuth();

  useEffect(() => {
    // Set up real-time listeners
    const productsRef = ref(database, 'products');
    const salesRef = ref(database, 'sales');

    // Listen for product changes
    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const products = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        
        const totalProducts = products.length;
        const lowStock = products.filter(p => (p.quantity || 0) <= 10).length;
        
        setStats(prev => ({
          ...prev,
          totalProducts,
          lowStock
        }));
      } else {
        setStats(prev => ({
          ...prev,
          totalProducts: 0,
          lowStock: 0
        }));
      }
    }, (error) => {
      console.error('Error fetching products:', error);
    });

    // Listen for sales changes
    const unsubscribeSales = onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sales = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        
        // Sort by timestamp (newest first)
        sales.sort((a, b) => {
          const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
          const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
          return dateB - dateA;
        });
        
        // Get recent sales (last 10)
        const recent = sales.slice(0, 10);
        
        // Calculate total revenue
        const revenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalSales: sales.length,
          revenue
        }));
        setRecentSales(recent);
      } else {
        setStats(prev => ({
          ...prev,
          totalSales: 0,
          revenue: 0
        }));
        setRecentSales([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching sales:', error);
      setLoading(false);
    });

    // Load users list
    loadUsersList();

    // Cleanup listeners on unmount
    return () => {
      off(productsRef);
      off(salesRef);
    };
  }, []);

  // Update total users when usersList changes
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      totalUsers: usersList.length
    }));
  }, [usersList]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const StatCard = ({ title, value, icon, color, onPress }) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <Icon name={icon} size={30} color={color} />
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const handleUpdateUserRole = async (uid, currentRole) => {
    const newRole = currentRole === 'admin' ? 'staff' : 'admin';
    Alert.alert(
      'Update User Role',
      `Change user role to ${newRole.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const result = await updateUserRole(uid, newRole);
            if (result.success) {
              Alert.alert('Success', 'User role updated successfully');
            } else {
              Alert.alert('Error', result.error);
            }
          }
        }
      ]
    );
  };

  const handleDeleteUser = async (uid) => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteUser(uid);
            if (result.success) {
              Alert.alert('Success', 'User deleted successfully');
            } else {
              Alert.alert('Error', result.error);
            }
          }
        }
      ]
    );
  };

  const UsersModal = () => (
    <Modal
      visible={showUsersModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Manage Users</Text>
            <TouchableOpacity onPress={() => setShowUsersModal(false)}>
              <Icon name="close" size={30} color="#333" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={usersList}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <View style={styles.userCard}>
                <View style={styles.userInfo}>
                  <Text style={styles.userEmail}>{item.email}</Text>
                  <View style={[styles.roleBadge, item.role === 'admin' ? styles.adminBadge : styles.staffBadge]}>
                    <Text style={styles.roleText}>{item.role?.toUpperCase() || 'STAFF'}</Text>
                  </View>
                  <Text style={styles.userStatus}>
                    Status: {item.isActive ? '🟢 Active' : '🔴 Inactive'}
                  </Text>
                </View>
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.roleButton]}
                    onPress={() => handleUpdateUserRole(item.uid, item.role)}
                  >
                    <Icon name="swap-horiz" size={20} color="#2196F3" />
                    <Text style={styles.actionButtonText}>Change Role</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteUser(item.uid)}
                  >
                    <Icon name="delete" size={20} color="#f44336" />
                    <Text style={[styles.actionButtonText, styles.deleteText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );

  if (loading && stats.totalProducts === 0 && stats.totalSales === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome, Admin!</Text>
        <Text style={styles.welcomeSubtext}>{userData?.email || 'Admin User'}</Text>
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon="shopping-cart"
          color="#4CAF50"
          onPress={() => navigation.navigate('Inventory')}
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStock}
          icon="warning"
          color="#ff9800"
          onPress={() => navigation.navigate('Inventory')}
        />
        <StatCard
          title="Total Sales"
          value={stats.totalSales}
          icon="receipt"
          color="#2196F3"
          onPress={() => navigation.navigate('Sales')}
        />
        <StatCard
          title="Revenue"
          value={`$${stats.revenue.toFixed(2)}`}
          icon="attach-money"
          color="#ff6b00"
          onPress={() => navigation.navigate('Sales')}
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon="people"
          color="#9C27B0"
          onPress={() => setShowUsersModal(true)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CategoryManagement')}
          >
            <Icon name="category" size={40} color="#ff6b00" />
            <Text style={styles.actionText}>Manage Categories</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Inventory')}
          >
            <Icon name="edit" size={40} color="#ff6b00" />
            <Text style={styles.actionText}>Manage Products</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Sales')}
          >
            <Icon name="history" size={40} color="#ff6b00" />
            <Text style={styles.actionText}>Sales Reports</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => setShowUsersModal(true)}
          >
            <Icon name="people" size={40} color="#ff6b00" />
            <Text style={styles.actionText}>Manage Users</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Sales</Text>
        {recentSales.length > 0 ? (
          recentSales.map((sale, index) => (
            <View key={index} style={styles.saleItem}>
              <View style={styles.saleHeader}>
                <Text style={styles.saleDate}>
                  {formatDate(sale.timestamp)}
                </Text>
                <Text style={styles.saleTotal}>${sale.total?.toFixed(2) || '0.00'}</Text>
              </View>
              <Text style={styles.saleItems}>{sale.items?.length || 0} items sold</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptySalesContainer}>
            <Text style={styles.emptySalesText}>No recent sales</Text>
          </View>
        )}
      </View>

      <UsersModal />
    </ScrollView>
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
  },
  welcomeSection: {
    backgroundColor: '#ff6b00',
    padding: 20,
    paddingTop: 30,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  welcomeSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  statCard: {
    backgroundColor: 'white',
    width: '48%',
    margin: '1%',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statInfo: {
    marginLeft: 15,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginTop: 20,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: 'white',
    width: '48%',
    marginBottom: 10,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    marginTop: 10,
    fontSize: 12,
    textAlign: 'center',
  },
  saleItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  saleDate: {
    fontSize: 12,
    color: '#666',
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6b00',
  },
  saleItems: {
    fontSize: 12,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  userCard: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  userInfo: {
    marginBottom: 10,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  adminBadge: {
    backgroundColor: '#ff6b00',
  },
  staffBadge: {
    backgroundColor: '#2196F3',
  },
  roleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userStatus: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    flex: 0.48,
    justifyContent: 'center',
  },
  roleButton: {
    backgroundColor: '#E3F2FD',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  actionButtonText: {
    marginLeft: 5,
    fontSize: 12,
  },
  deleteText: {
    color: '#f44336',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  emptySalesContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
  },
  emptySalesText: {
    fontSize: 14,
    color: '#666',
  },
});