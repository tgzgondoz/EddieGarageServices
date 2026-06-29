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
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
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
  const { userData, usersList, loadUsersList, updateUserRole, deleteUser } = useAuth();

  useEffect(() => {
    fetchDashboardData();
    loadUsersList();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch products from Firestore
      const productsQuery = query(collection(db, 'products'));
      const productsSnapshot = await getDocs(productsQuery);
      const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const totalProducts = products.length;
      const lowStock = products.filter(p => p.quantity <= 10).length;

      // Fetch sales from Firestore
      const salesQuery = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(10));
      const salesSnapshot = await getDocs(salesQuery);
      const sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const totalSales = sales.length;
      const revenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);

      setStats({ 
        totalProducts, 
        lowStock, 
        totalSales, 
        revenue, 
        totalUsers: usersList.length 
      });
      setRecentSales(sales);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
                    <Text style={styles.roleText}>{item.role?.toUpperCase()}</Text>
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
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome, Admin!</Text>
        <Text style={styles.welcomeSubtext}>{userData?.email}</Text>
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
          value={usersList.length}
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
        {recentSales.map((sale, index) => (
          <View key={index} style={styles.saleItem}>
            <View style={styles.saleHeader}>
              <Text style={styles.saleDate}>
                {sale.timestamp?.toDate().toLocaleString()}
              </Text>
              <Text style={styles.saleTotal}>${sale.total?.toFixed(2)}</Text>
            </View>
            <Text style={styles.saleItems}>{sale.items?.length} items sold</Text>
          </View>
        ))}
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
});