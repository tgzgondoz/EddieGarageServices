// screens/StaffDashboardScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { database } from '../config/firebase';
import { ref, onValue, off } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function StaffDashboardScreen({ navigation }) {
  const [stats, setStats] = useState({
    totalSales: 0,
    revenue: 0,
  });
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { userData, logout } = useAuth();

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

    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const salesRef = ref(database, 'sales');
    
    const unsubscribe = onValue(salesRef, (snapshot) => {
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
        
        setStats({
          totalSales: sales.length,
          revenue: revenue
        });
        setRecentSales(recent);
      } else {
        setStats({
          totalSales: 0,
          revenue: 0
        });
        setRecentSales([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching sales:', error);
      setLoading(false);
    });

    return () => off(salesRef);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
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
          <View style={styles.statIconContainer}>
            <Icon name={icon} size={24} color={color} />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statTitle}>{title}</Text>
          </View>
          {onPress && (
            <Icon name="chevron-right" size={20} color="#ccc" />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

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
            <Icon name="logout" size={40} color="#2196F3" />
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
              <Icon name="logout" size={18} color="white" />
              <Text style={styles.logoutConfirmText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  const renderRecentSale = ({ item }) => (
    <View style={styles.saleItem}>
      <View style={styles.saleHeader}>
        <View style={styles.saleLeft}>
          <View style={styles.saleIcon}>
            <Icon name="receipt" size={18} color="#2196F3" />
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

  if (loading && stats.totalSales === 0) {
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
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
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
              <Icon name="menu" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Staff Dashboard</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.headerIconButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Icon name="person" size={22} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIconButton}
              onPress={() => setShowLogoutModal(true)}
            >
              <Icon name="logout" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2196F3']} />
          }
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <View style={styles.welcomeContent}>
                <View>
                  <Text style={styles.welcomeGreeting}>{getGreeting()} 👋</Text>
                  <Text style={styles.welcomeText}>Welcome back, {userData?.displayName || 'Staff'}!</Text>
                  <Text style={styles.welcomeSubtext}>{userData?.email || 'Staff User'}</Text>
                </View>
                <View style={styles.welcomeAvatar}>
                  <Text style={styles.welcomeAvatarText}>
                    {(userData?.displayName || userData?.email || 'S').charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStatsContainer}>
              <View style={styles.quickStatItem}>
                <Text style={styles.quickStatValue}>{stats.totalSales}</Text>
                <Text style={styles.quickStatLabel}>Total Sales</Text>
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
                color="#FF6B00"
                onPress={() => navigation.navigate('Sales')}
              />
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionGrid}>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('POS')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
                    <Icon name="point-of-sale" size={28} color="#FF6B00" />
                  </View>
                  <Text style={styles.actionText}>Start New Sale</Text>
                  <Text style={styles.actionSubtext}>Process customer orders</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={() => navigation.navigate('Sales')}
                >
                  <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                    <Icon name="history" size={28} color="#2196F3" />
                  </View>
                  <Text style={styles.actionText}>Sales History</Text>
                  <Text style={styles.actionSubtext}>View past transactions</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Sales Section */}
            {recentSales.length > 0 && (
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
                {recentSales.slice(0, 5).map((item) => renderRecentSale({ item }))}
                {recentSales.length > 5 && (
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={() => navigation.navigate('Sales')}
                  >
                    <Text style={styles.viewAllButtonText}>View All {recentSales.length} Sales</Text>
                    <Icon name="arrow-forward" size={16} color="#2196F3" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.footerSpacer} />
          </Animated.View>
        </ScrollView>

        <LogoutModal />
      </SafeAreaView>
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
    borderColor: '#2196F3',
    borderTopColor: 'transparent',
    marginBottom: 12,
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  // Header
  customHeader: {
    backgroundColor: '#2196F3',
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
    color: 'white',
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
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeGreeting: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  welcomeSubtext: {
    fontSize: 13,
    color: '#888',
  },
  welcomeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeAvatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  // Quick Stats
  quickStatsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  quickStatLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statCard: {
    backgroundColor: 'white',
    width: (width - 44) / 2,
    margin: 5,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
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
    color: '#1a1a2e',
  },
  statTitle: {
    fontSize: 11,
    color: '#888',
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
    color: '#1a1a2e',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 1,
  },
  viewAllText: {
    color: '#2196F3',
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
    backgroundColor: 'white',
    width: (width - 48) / 2,
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    color: '#1a1a2e',
  },
  actionSubtext: {
    fontSize: 10,
    color: '#888',
    marginTop: 1,
  },
  // Sales Items
  saleItem: {
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
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
    flex: 1,
  },
  saleIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  saleId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  saleDate: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B00',
  },
  saleItems: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
    marginRight: 4,
  },
  footerSpacer: {
    height: 20,
  },
  // Logout Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoutModalContent: {
    backgroundColor: 'white',
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
  },
  logoutIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  logoutModalText: {
    fontSize: 14,
    color: '#666',
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
    backgroundColor: '#f5f5f5',
  },
  logoutCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  logoutConfirmButton: {
    backgroundColor: '#2196F3',
    gap: 6,
  },
  logoutConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 6,
  },
});