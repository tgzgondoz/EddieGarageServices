import React from 'react';
import { View, Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

import LoginScreen from '../screens/LoginScreen';
import POSScreen from '../screens/POSScreen';
import InventoryScreen from '../screens/InventoryScreen';
import AddEditProductScreen from '../screens/AddEditProductScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import ProductListScreen from '../screens/ProductListScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import SalesHistoryScreen from '../screens/SalesHistoryScreen';
import RestrictedScreen from '../screens/RestrictedScreen';
import CategoryManagementScreen from '../screens/CategoryManagementScreen';
import StaffDashboardScreen from '../screens/StaffDashboardScreen';
import UserProfileScreen from '../screens/UserProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Logout button component
function LogoutButton({ navigation }) {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Icon
      name="logout"
      size={24}
      color="#fff"
      style={{ marginRight: 15 }}
      onPress={handleLogout}
    />
  );
}

// Profile button component
function ProfileButton({ navigation }) {
  return (
    <Icon
      name="person"
      size={24}
      color="#fff"
      style={{ marginRight: 15 }}
      onPress={() => navigation.navigate('Profile')}
    />
  );
}

// Profile Stack Navigator
function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Profile" 
        component={UserProfileScreen} 
        options={{ title: 'My Profile' }}
      />
    </Stack.Navigator>
  );
}

// Inventory Stack Navigator
function InventoryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="InventoryList" 
        component={InventoryScreen} 
        options={{ title: 'Inventory Management' }}
      />
      <Stack.Screen 
        name="AddEditProduct" 
        component={AddEditProductScreen} 
        options={{ title: 'Add/Edit Product' }}
      />
      <Stack.Screen 
        name="ProductDetails" 
        component={ProductDetailsScreen} 
        options={{ title: 'Product Details' }}
      />
      <Stack.Screen 
        name="CategoryManagement" 
        component={CategoryManagementScreen} 
        options={{ title: 'Manage Categories' }}
      />
    </Stack.Navigator>
  );
}

// Product Stack Navigator
function ProductStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ProductList" 
        component={ProductListScreen} 
        options={{ title: 'Products' }}
      />
      <Stack.Screen 
        name="ProductDetails" 
        component={ProductDetailsScreen} 
        options={{ title: 'Product Details' }}
      />
      <Stack.Screen 
        name="AddEditProduct" 
        component={AddEditProductScreen} 
        options={{ title: 'Add/Edit Product' }}
      />
    </Stack.Navigator>
  );
}

// ADMIN TABS - Full access for Admin
function AdminTabs() {
  console.log('🎯 Rendering Admin Tabs');
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch(route.name) {
            case 'Dashboard': iconName = 'dashboard'; break;
            case 'POS': iconName = 'point-of-sale'; break;
            case 'Inventory': iconName = 'inventory'; break;
            case 'Products': iconName = 'shopping-cart'; break;
            case 'Sales': iconName = 'history'; break;
            default: iconName = 'home';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ff6b00',
        tabBarInactiveTintColor: 'gray',
        headerStyle: { backgroundColor: '#ff6b00' },
        headerTintColor: '#fff',
        headerRight: () => (
          <View style={{ flexDirection: 'row' }}>
            <ProfileButton navigation={navigation} />
            <LogoutButton navigation={navigation} />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="POS" component={POSScreen} />
      <Tab.Screen name="Inventory" component={InventoryStack} />
      <Tab.Screen name="Products" component={ProductStack} />
      <Tab.Screen name="Sales" component={SalesHistoryScreen} />
    </Tab.Navigator>
  );
}

// STAFF TABS - Limited access for Staff
function StaffTabs() {
  console.log('🎯 Rendering Staff Tabs');
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch(route.name) {
            case 'Dashboard': iconName = 'dashboard'; break;
            case 'POS': iconName = 'point-of-sale'; break;
            case 'Sales': iconName = 'history'; break;
            default: iconName = 'home';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ff6b00',
        tabBarInactiveTintColor: 'gray',
        headerStyle: { backgroundColor: '#ff6b00' },
        headerTintColor: '#fff',
        headerRight: () => (
          <View style={{ flexDirection: 'row' }}>
            <ProfileButton navigation={navigation} />
            <LogoutButton navigation={navigation} />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={StaffDashboardScreen} />
      <Tab.Screen name="POS" component={POSScreen} />
      <Tab.Screen name="Sales" component={SalesHistoryScreen} />
    </Tab.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { currentUser, userRole, loading } = useAuth();

  console.log('🔍 AppNavigator - Current State:');
  console.log('  - loading:', loading);
  console.log('  - currentUser:', currentUser?.email);
  console.log('  - userRole:', userRole);
  console.log('  - isAdmin:', userRole === 'admin');
  console.log('  - isStaff:', userRole === 'staff');

  if (loading) {
    console.log('⏳ Showing loading screen');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!currentUser) {
    console.log('🔐 No user - showing Login');
    return (
      <Stack.Navigator>
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  if (userRole === 'restricted') {
    console.log('🚫 User is restricted');
    return (
      <Stack.Navigator>
        <Stack.Screen 
          name="Restricted" 
          component={RestrictedScreen} 
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  // ADMIN gets full access with AdminDashboard
  if (userRole === 'admin') {
    console.log('✅ ADMIN user - Showing Admin Dashboard');
    return <AdminTabs />;
  } 
  // STAFF gets limited access with StaffDashboard
  else {
    console.log('👤 STAFF user - Showing Staff Dashboard');
    return <StaffTabs />;
  }
}