import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Animated,
  Dimensions,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { database } from '../config/firebase';
import { ref, onValue, off } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function AdminDashboardScreen({ navigation }) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    totalSales: 0,
    revenue: 0,
    totalUsers: 0,
  });
  const [recentSales, setRecentSales] = useState([]);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userData, usersList, loadUsersList, updateUserRole, deleteUser, logout } = useAuth();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
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

  useEffect(() => {
    const productsRef = ref(database, 'products');
    const salesRef = ref(database, 'sales');

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
    });

    const unsubscribeSales = onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const sales = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        
        sales.sort((a, b) => {
          const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
          const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
          return dateB - dateA;
        });
        
        const recent = sales.slice(0, 10);
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
    });

    loadUsersList();

    return () => {
      off(productsRef);
      off(salesRef);
    };
  }, []);

  useEffect(() => {
    setStats(prev => ({
      ...prev,
      totalUsers: usersList.length
    }));
  }, [usersList]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsersList();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    setShowLogoutModal(false);
    const result = await logout();
    if (result.success) {
      navigation.replace('Login');
    } else {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const StatCard = ({ title, value, icon, color, onPress }) => {
    const scaleValue = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleValue, {
        toValue: 0.96,
        friction: 5,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <TouchableOpacity
          style={[styles.statCard, { borderLeftColor: color }]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
            <Icon name={icon} size={28} color={color} />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
          </View>
          {onPress && (
            <Icon name="chevron-right" size={20} color="#bbb" style={styles.statArrow} />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

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

  const LogoutModal = () => (
    <Modal
      visible={showLogoutModal}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.logoutModalOverlay}>
        <Animated.View 
          style={[
            styles.logoutModalContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.logoutIconContainer}>
            <Icon name="logout" size={50} color="#FF6B00" />
          </View>
          <Text style={styles.logoutModalTitle}>Logout</Text>
          <Text style={styles.logoutModalText}>
            Are you sure you want to logout? You'll need to login again to access your dashboard.
          </Text>
          <View style={styles.logoutModalButtons}>
            <TouchableOpacity
              style={[styles.logoutModalButton, styles.logoutCancelButton]}
              onPress={() => setShowLogoutModal(false)}
            >
              <Text style={styles.logoutCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.logoutModalButton, styles.logoutConfirmButton]}
              onPress={handleLogout}
            >
              <Icon name="logout" size={20} color="white" />
              <Text style={styles.logoutConfirmText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  const UsersModal = () => (
    <Modal
      visible={showUsersModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.modalContent, { opacity: fadeAnim }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Manage Users</Text>
              <Text style={styles.modalSubtitle}>
                {usersList.length} users registered
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowUsersModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={usersList}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <View style={styles.userCard}>
                <View style={styles.userInfo}>
                  <View style={styles.userHeader}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {item.email?.charAt(0).toUpperCase() || 'U'}
                      </Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userEmail} numberOfLines={1}>
                        {item.email}
                      </Text>
                      <View style={styles.userMeta}>
                        <View style={[styles.roleBadge, item.role === 'admin' ? styles.adminBadge : styles.staffBadge]}>
                          <Text style={styles.roleText}>
                            {item.role?.toUpperCase() || 'STAFF'}
                          </Text>
                        </View>
                        <View style={[styles.statusDot, item.isActive ? styles.activeDot : styles.inactiveDot]} />
                        <Text style={styles.userStatus}>
                          {item.isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.userActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.roleButton]}
                    onPress={() => handleUpdateUserRole(item.uid, item.role)}
                  >
                    <Icon name="swap-horiz" size={18} color="#2196F3" />
                    <Text style={[styles.actionButtonText, { color: '#2196F3' }]}>
                      Change Role
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteUser(item.uid)}
                  >
                    <Icon name="delete-outline" size={18} color="#f44336" />
                    <Text style={[styles.actionButtonText, { color: '#f44336' }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="people-outline" size={60} color="#ddd" />
                <Text style={styles.emptyText}>No users found</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </View>
    </Modal>
  );

  if (loading && stats.totalProducts === 0 && stats.totalSales === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#FF6B00" />
      <View style={styles.container}>
        {/* Custom Header with Logout Button */}
        <Animated.View 
          style={[
            styles.customHeader,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.headerLeft}>
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => navigation.openDrawer?.()}
            >
              <Icon name="menu" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.headerIconButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon name="notifications-none" size={24} color="white" />
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>3</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.logoutButton}
              onPress={() => setShowLogoutModal(true)}
            >
              <Icon name="logout" size={22} color="white" />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
            <View style={styles.welcomeSection}>
              <View style={styles.welcomeContent}>
                <View>
                  <Text style={styles.welcomeGreeting}>Good Morning 👋</Text>
                  <Text style={styles.welcomeText}>Welcome back, Admin</Text>
                  <Text style={styles.welcomeSubtext}>{userData?.email || 'Admin User'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.statsContainer}>
              <StatCard
                title="Total Products"
                value={stats.totalProducts}
                icon="inventory-2"
                color="#4CAF50"
                onPress={() => navigation.navigate('Inventory')}
              />
              <StatCard
                title="Low Stock Items"
                value={stats.lowStock}
                icon="warning"
                color="#FF9800"
                onPress={() => navigation.navigate('Inventory')}
              />
              <StatCard
                title="Total Sales"
                value={stats.totalSales}
                icon="receipt-long"
                color="#2196F3"
                onPress={() => navigation.navigate('Sales')}
              />
              <StatCard
                title="Revenue"
                value={`$${stats.revenue.toFixed(2)}`}
                icon="payments"
                color="#E91E63"
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
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <Text style={styles.sectionSubtitle}>Manage your store</Text>
              </View>
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('CategoryManagement')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
                    <Icon name="category" size={32} color="#FF6B00" />
                  </View>
                  <Text style={styles.actionText}>Categories</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('Inventory')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Icon name="edit" size={32} color="#4CAF50" />
                  </View>
                  <Text style={styles.actionText}>Products</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('Sales')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                    <Icon name="analytics" size={32} color="#2196F3" />
                  </View>
                  <Text style={styles.actionText}>Reports</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => setShowUsersModal(true)}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
                    <Icon name="people" size={32} color="#9C27B0" />
                  </View>
                  <Text style={styles.actionText}>Users</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Recent Sales</Text>
                  <Text style={styles.sectionSubtitle}>Latest transactions</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Sales')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              {recentSales.length > 0 ? (
                recentSales.slice(0, 5).map((sale, index) => (
                  <Animated.View 
                    key={index} 
                    style={[styles.saleItem, {
                      opacity: fadeAnim,
                      transform: [{ translateX: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })}]
                    }]}
                  >
                    <View style={styles.saleHeader}>
                      <View style={styles.saleLeft}>
                        <View style={styles.saleIcon}>
                          <Icon name="receipt" size={20} color="#FF6B00" />
                        </View>
                        <View>
                          <Text style={styles.saleId}>Sale #{sale.id?.slice(-6) || 'N/A'}</Text>
                          <Text style={styles.saleDate}>{formatDate(sale.timestamp)}</Text>
                        </View>
                      </View>
                      <View style={styles.saleRight}>
                        <Text style={styles.saleTotal}>${sale.total?.toFixed(2) || '0.00'}</Text>
                        <Text style={styles.saleItems}>{sale.items?.length || 0} items</Text>
                      </View>
                    </View>
                  </Animated.View>
                ))
              ) : (
                <View style={styles.emptySalesContainer}>
                  <Icon name="receipt-long" size={50} color="#ddd" />
                  <Text style={styles.emptySalesText}>No recent sales</Text>
                  <Text style={styles.emptySalesSubtext}>Sales will appear here</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>

        <UsersModal />
        <LogoutModal />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FF6B00',
    borderTopColor: 'transparent',
    marginBottom: 12,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  // Custom Header Styles
  customHeader: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    padding: 8,
    marginRight: 8,
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF1744',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF6B00',
  },
  headerBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoutButtonText: {
    color: 'white',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeGreeting: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#888',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  statCard: {
    backgroundColor: 'white',
    width: (width - 44) / 2,
    margin: 5,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  statTitle: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  statArrow: {
    marginLeft: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  viewAllText: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: 'white',
    width: (width - 56) / 2,
    marginBottom: 12,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  saleItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  saleId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  saleDate: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  saleTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B00',
  },
  saleItems: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  // Logout Modal Styles
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoutModalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 10,
  },
  logoutIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  logoutModalText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  logoutModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  logoutCancelButton: {
    backgroundColor: '#f5f5f5',
  },
  logoutCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  logoutConfirmButton: {
    backgroundColor: '#FF6B00',
    gap: 8,
  },
  logoutConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  // User Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  userInfo: {
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },
  adminBadge: {
    backgroundColor: '#FF6B00',
  },
  staffBadge: {
    backgroundColor: '#2196F3',
  },
  roleText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  activeDot: {
    backgroundColor: '#4CAF50',
  },
  inactiveDot: {
    backgroundColor: '#f44336',
  },
  userStatus: {
    fontSize: 12,
    color: '#666',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
  },
  roleButton: {
    backgroundColor: '#E3F2FD',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  actionButtonText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    marginTop: 12,
  },
  emptySalesContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
  },
  emptySalesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginTop: 12,
  },
  emptySalesSubtext: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
});