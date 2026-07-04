// screens/AdminDashboardScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Animated,
  Dimensions,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  Image,
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
  const statFadeAnim = useRef(new Animated.Value(0)).current;

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
      Animated.timing(statFadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 300,
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const StatCard = ({ title, value, icon, color, onPress, subtitle }) => {
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
      <Animated.View style={{ transform: [{ scale: scaleValue }], opacity: statFadeAnim }}>
        <TouchableOpacity
          style={[styles.statCard, { borderLeftColor: color }]}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <View style={[styles.statIconContainer, { backgroundColor: color }]}>
            <Icon name={icon} size={24} color="#FFFFFF" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
            {subtitle && (
              <Text style={styles.statSubtitle}>{subtitle}</Text>
            )}
          </View>
          {onPress && (
            <Icon name="chevron-right" size={20} color="#152d2a" />
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
      'Are you sure you want to delete this user? This action cannot be undone.',
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

  const renderRecentSale = ({ item }) => (
    <View style={styles.saleItem}>
      <View style={styles.saleHeader}>
        <View style={styles.saleLeft}>
          <View style={styles.saleIcon}>
            <Icon name="receipt" size={18} color="#178556" />
          </View>
          <View>
            <Text style={styles.saleId}>Order #{item.id.slice(-6)}</Text>
            <Text style={styles.saleDate}>{formatDate(item.timestamp)}</Text>
          </View>
        </View>
        <View style={styles.saleRight}>
          <Text style={styles.saleTotal}>${item.total?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.saleItems}>{item.items?.length || 0} items</Text>
        </View>
      </View>
    </View>
  );

  const LogoutModal = () => (
    <Modal
      visible={showLogoutModal}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
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
            <Icon name="logout" size={40} color="#178556" />
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
              <Icon name="logout" size={18} color="#FFFFFF" />
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
      <View style={styles.modalOverlay}>
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
              <Icon name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={usersList}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => (
              <View style={styles.userCard}>
                <View style={styles.userInfo}>
                  <View style={styles.userHeader}>
                    <View style={[styles.userAvatar, item.role === 'admin' ? styles.adminAvatar : styles.staffAvatar]}>
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
                          <Icon 
                            name={item.role === 'admin' ? 'admin-panel-settings' : 'person'} 
                            size={10} 
                            color="#FFFFFF" 
                          />
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
                    <Icon name="swap-horiz" size={14} color="#178556" />
                    <Text style={[styles.actionButtonText, { color: '#178556' }]}>
                      Change Role
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteUser(item.uid)}
                  >
                    <Icon name="delete" size={14} color="#f44336" />
                    <Text style={[styles.actionButtonText, { color: '#f44336' }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="people" size={60} color="#90a5a0" />
                <Text style={styles.emptyTitle}>No Users Found</Text>
                <Text style={styles.emptySubtitle}>Users will appear here once they register</Text>
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
      <StatusBar barStyle="light-content" backgroundColor="#178556" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
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
              <Icon name="menu" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Dashboard</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.headerIconButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Icon name="person" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIconButton}
              onPress={() => setShowLogoutModal(true)}
            >
              <Icon name="logout" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#178556']} />
          }
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <View style={styles.welcomeContent}>
                <View>
                  <Text style={styles.welcomeGreeting}>{getGreeting()} 👋</Text>
                  <Text style={styles.welcomeText}>Welcome back, Admin</Text>
                  <Text style={styles.welcomeSubtext}>{userData?.email || 'Admin User'}</Text>
                </View>
                <View style={styles.welcomeAvatar}>
                  <Text style={styles.welcomeAvatarText}>
                    {userData?.email?.charAt(0).toUpperCase() || 'A'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStatsContainer}>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{stats.totalProducts}</Text>
                <Text style={styles.quickStatLabel}>Products</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{stats.totalSales}</Text>
                <Text style={styles.quickStatLabel}>Sales</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>${stats.revenue.toFixed(0)}</Text>
                <Text style={styles.quickStatLabel}>Revenue</Text>
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsContainer}>
              <StatCard
                title="Total Products"
                value={stats.totalProducts}
                icon="inventory-2"
                color="#4CAF50"
                onPress={() => navigation.navigate('Inventory')}
              />
              <StatCard
                title="Low Stock Alert"
                value={stats.lowStock}
                icon="warning"
                color="#FF9800"
                onPress={() => navigation.navigate('Inventory')}
                subtitle={stats.lowStock > 0 ? `${stats.lowStock} items need restock` : 'All items in stock'}
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

            {/* Recent Sales Section */}
            {recentSales.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Recent Sales</Text>
                    <Text style={styles.sectionSubtitle}>Latest 10 transactions</Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('Sales')}>
                    <Text style={styles.viewAllText}>View All</Text>
                  </TouchableOpacity>
                </View>
                {recentSales.slice(0, 5).map((item) => renderRecentSale({ item }))}
                {recentSales.length > 5 && (
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={() => navigation.navigate('Sales')}
                  >
                    <Text style={styles.viewAllButtonText}>View All {recentSales.length} Sales</Text>
                    <Icon name="arrow-forward" size={16} color="#178556" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('POS')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Icon name="point-of-sale" size={28} color="#178556" />
                  </View>
                  <Text style={styles.actionText}>POS</Text>
                  <Text style={styles.actionSubtext}>Start new sale</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('AddEditProduct')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Icon name="add-shopping-cart" size={28} color="#178556" />
                  </View>
                  <Text style={styles.actionText}>Add Product</Text>
                  <Text style={styles.actionSubtext}>Add new product</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('CategoryManagement')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Icon name="category" size={28} color="#178556" />
                  </View>
                  <Text style={styles.actionText}>Categories</Text>
                  <Text style={styles.actionSubtext}>Manage categories</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('Sales')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Icon name="history" size={28} color="#178556" />
                  </View>
                  <Text style={styles.actionText}>Sales History</Text>
                  <Text style={styles.actionSubtext}>View transactions</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footerSpacer} />
          </Animated.View>
        </ScrollView>

        <UsersModal />
        <LogoutModal />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#152d2a',
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  loadingText: {
    color: '#90a5a0',
    fontSize: 16,
  },
  // Header
  customHeader: {
    backgroundColor: '#178556',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  // Welcome Section
  welcomeSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#90a5a0',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#178556',
  },
  welcomeGreeting: {
    fontSize: 14,
    color: '#152d2a',
    marginBottom: 2,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#152d2a',
    marginBottom: 2,
  },
  welcomeSubtext: {
    fontSize: 13,
    color: '#152d2a',
  },
  welcomeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#178556',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  // Quick Stats
  quickStatsContainer: {
    flexDirection: 'row',
    backgroundColor: '#90a5a0',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#178556',
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#152d2a',
  },
  quickStatLabel: {
    fontSize: 11,
    color: '#152d2a',
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: '#152d2a',
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statCard: {
    backgroundColor: '#90a5a0',
    width: (width - 44) / 2,
    margin: 5,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#178556',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#152d2a',
  },
  statTitle: {
    fontSize: 11,
    color: '#152d2a',
    marginTop: 1,
  },
  statSubtitle: {
    fontSize: 9,
    color: '#152d2a',
    marginTop: 1,
  },
  // Section
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#90a5a0',
    marginTop: 1,
  },
  viewAllText: {
    color: '#178556',
    fontSize: 13,
    fontWeight: '600',
  },
  // Quick Actions
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: '#90a5a0',
    width: (width - 48) / 2,
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#178556',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#152d2a',
  },
  actionSubtext: {
    fontSize: 10,
    color: '#152d2a',
    marginTop: 1,
  },
  // Sales Items
  saleItem: {
    backgroundColor: '#90a5a0',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#178556',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  saleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#152d2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  saleId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#152d2a',
  },
  saleDate: {
    fontSize: 11,
    color: '#152d2a',
    marginTop: 1,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#178556',
  },
  saleItems: {
    fontSize: 11,
    color: '#152d2a',
    marginTop: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#90a5a0',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#178556',
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#178556',
    marginRight: 4,
  },
  footerSpacer: {
    height: 20,
  },
  // Logout Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoutModalContent: {
    backgroundColor: '#90a5a0',
    borderRadius: 24,
    padding: 28,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#178556',
  },
  logoutIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#152d2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#152d2a',
    marginBottom: 8,
  },
  logoutModalText: {
    fontSize: 14,
    color: '#152d2a',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  logoutModalButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  logoutModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  logoutCancelButton: {
    backgroundColor: '#152d2a',
  },
  logoutCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#90a5a0',
  },
  logoutConfirmButton: {
    backgroundColor: '#178556',
    gap: 6,
  },
  logoutConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  // Users Modal
  modalContent: {
    backgroundColor: '#90a5a0',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '85%',
    width: '100%',
    borderWidth: 1,
    borderColor: '#178556',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#152d2a',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#152d2a',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#152d2a',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#152d2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#152d2a',
  },
  userInfo: {
    marginBottom: 10,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  adminAvatar: {
    backgroundColor: '#178556',
  },
  staffAvatar: {
    backgroundColor: '#90a5a0',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#152d2a',
    marginBottom: 3,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
  },
  adminBadge: {
    backgroundColor: '#178556',
  },
  staffBadge: {
    backgroundColor: '#90a5a0',
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    marginLeft: 3,
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
    fontSize: 11,
    color: '#152d2a',
  },
  userActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  roleButton: {
    backgroundColor: '#E3F2FD',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#152d2a',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#152d2a',
    marginTop: 4,
  },
});