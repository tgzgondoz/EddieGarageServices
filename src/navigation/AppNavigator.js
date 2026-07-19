import React, { useState, useRef } from 'react';
import { TouchableOpacity, View, Text, Image, StyleSheet, Platform, ScrollView, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import screens
import POSScreen from '../screens/POSScreen';
import ProductManagementScreen from '../screens/ProductManagementScreen';
import SalesHistoryScreen from '../screens/SalesHistoryScreen';
import InventoryScreen from '../screens/InventoryScreen';
import CategoryManagementScreen from '../screens/CategoryManagementScreen';
import RestrictedScreen from '../screens/RestrictedScreen';

const { width } = Dimensions.get('window');

const AppNavigator = ({ onLogout }) => {
  const { user, isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('POS');
  const scrollViewRef = useRef(null);
  
  if (!user) {
    return null;
  }

  // Define all tabs
  const tabs = [
    {
      name: 'POS',
      component: POSScreen,
      label: 'POS',
      icon: 'cart',
      accessible: true,
      params: {}
    },
    {
      name: 'Products',
      component: isAdmin() ? ProductManagementScreen : RestrictedScreen,
      label: 'Products',
      icon: 'cube',
      accessible: isAdmin(),
      params: { screenName: 'Product Management' }
    },
    {
      name: 'Categories',
      component: isAdmin() ? CategoryManagementScreen : RestrictedScreen,
      label: 'Categories',
      icon: 'folder',
      accessible: isAdmin(),
      params: { screenName: 'Category Management' }
    },
    {
      name: 'Sales',
      component: SalesHistoryScreen,
      label: 'Sales',
      icon: 'stats-chart',
      accessible: true,
      params: {}
    },
    {
      name: 'Inventory',
      component: isAdmin() ? InventoryScreen : RestrictedScreen,
      label: 'Inventory',
      icon: 'list',
      accessible: isAdmin(),
      params: { screenName: 'Inventory Dashboard' }
    }
  ];

  // Filter tabs based on access
  const accessibleTabs = tabs.filter(tab => tab.accessible);
  const ActiveComponent = accessibleTabs.find(tab => tab.name === activeTab)?.component || POSScreen;
  const activeParams = accessibleTabs.find(tab => tab.name === activeTab)?.params || {};

  // Scroll to center the active tab
  const scrollToTab = (tabIndex) => {
    const tabWidth = width / Math.min(accessibleTabs.length, 5);
    const scrollPosition = (tabIndex * tabWidth) - (width / 2) + (tabWidth / 2);
    scrollViewRef.current?.scrollTo({ x: Math.max(0, scrollPosition), animated: true });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.logoText}>POS</Text>
        </View>
        <TouchableOpacity 
          onPress={onLogout} 
          style={styles.logoutButton}
          activeOpacity={0.7}
        >
          <Icon name="log-out-outline" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Top Tab Navigation - Custom */}
      <View style={styles.tabBarContainer}>
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          {accessibleTabs.map((tab, index) => {
            const isActive = activeTab === tab.name;
            return (
              <TouchableOpacity
                key={tab.name}
                style={[
                  styles.tabItem,
                  isActive && styles.tabItemActive
                ]}
                onPress={() => {
                  setActiveTab(tab.name);
                  scrollToTab(index);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.tabContent}>
                  <Icon 
                    name={isActive ? tab.icon : `${tab.icon}-outline`} 
                    size={20} 
                    color={isActive ? '#0D5335' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive
                  ]}>
                    {tab.label}
                  </Text>
                </View>
                {isActive && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active Screen */}
      <View style={styles.screenContainer}>
        <ActiveComponent {...activeParams} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: Platform.OS === 'web' ? 60 : 56,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: Platform.OS === 'web' ? 40 : 36,
    height: Platform.OS === 'web' ? 40 : 36,
    borderRadius: Platform.OS === 'web' ? 20 : 18,
    backgroundColor: '#0D533515',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: Platform.OS === 'web' ? 32 : 28,
    height: Platform.OS === 'web' ? 32 : 28,
    borderRadius: Platform.OS === 'web' ? 16 : 14,
  },
  logoText: {
    marginLeft: 10,
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: '700',
    color: '#0D5335',
  },
  logoutButton: {
    width: Platform.OS === 'web' ? 44 : 40,
    height: Platform.OS === 'web' ? 44 : 40,
    borderRadius: Platform.OS === 'web' ? 22 : 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    height: 56,
  },
  tabScrollContent: {
    flexGrow: 1,
    justifyContent: 'space-around',
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    minWidth: 70,
  },
  tabItemActive: {
    // Active state styling
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabLabelActive: {
    color: '#0D5335',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#0D5335',
    borderRadius: 3,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
});

export default AppNavigator;