// AppNavigator.js
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
    <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
      <Icon name="logout" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

// Profile button component
function ProfileButton({ navigation }) {
  return (
    <TouchableOpacity 
      onPress={() => navigation.navigate('Profile')} 
      style={{ marginRight: 15 }}
    >
      <Icon name="person" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

// Profile Stack Navigator
function ProfileStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#152d2a' }
      }}
    >
      <Stack.Screen 
        name="Profile" 
        component={UserProfileScreen} 
      />
    </Stack.Navigator>
  );
}

// Inventory Stack Navigator
function InventoryStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#152d2a' }
      }}
    >
      <Stack.Screen 
        name="InventoryList" 
        component={InventoryScreen} 
      />
      <Stack.Screen 
        name="AddEditProduct" 
        component={AddEditProductScreen} 
      />
      <Stack.Screen 
        name="ProductDetails" 
        component={ProductDetailsScreen} 
      />
      <Stack.Screen 
        name="CategoryManagement" 
        component={CategoryManagementScreen} 
      />
    </Stack.Navigator>
  );
}

// Product Stack Navigator
function ProductStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#152d2a' }
      }}
    >
      <Stack.Screen 
        name="ProductList" 
        component={ProductListScreen} 
      />
      <Stack.Screen 
        name="ProductDetails" 
        component={ProductDetailsScreen} 
      />
      <Stack.Screen 
        name="AddEditProduct" 
        component={AddEditProductScreen} 
      />
      <Stack.Screen 
        name="CategoryManagement" 
        component={CategoryManagementScreen} 
      />
    </Stack.Navigator>
  );
}

// POS Stack Navigator (for standalone POS with header)
function POSStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#152d2a' }
      }}
    >
      <Stack.Screen 
        name="POSMain" 
        component={POSScreen} 
      />
    </Stack.Navigator>
  );
}

// Sales Stack Navigator
function SalesStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#152d2a' }
      }}
    >
      <Stack.Screen 
        name="SalesHistory" 
        component={SalesHistoryScreen} 
      />
    </Stack.Navigator>
  );
}

// Custom Tab Bar Button for Profile
function ProfileTabButton({ navigation }) {
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Profile')}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 8,
      }}
    >
      <Icon name="person" size={26} color="#178556" />
      <Text style={{ fontSize: 10, color: '#178556', marginTop: 2 }}>Profile</Text>
    </TouchableOpacity>
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
            case 'Categories': iconName = 'category'; break;
            default: iconName = 'home';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#178556',
        tabBarInactiveTintColor: '#90a5a0',
        tabBarStyle: {
          backgroundColor: '#152d2a',
          borderTopColor: '#178556',
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={AdminDashboardScreen} 
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <ProfileButton navigation={navigation} />
              <LogoutButton navigation={navigation} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="POS" 
        component={POSStack} 
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <ProfileButton navigation={navigation} />
              <LogoutButton navigation={navigation} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Inventory" 
        component={InventoryStack} 
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <ProfileButton navigation={navigation} />
              <LogoutButton navigation={navigation} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductStack} 
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <ProfileButton navigation={navigation} />
              <LogoutButton navigation={navigation} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Categories" 
        component={CategoryManagementScreen} 
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <ProfileButton navigation={navigation} />
              <LogoutButton navigation={navigation} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Sales" 
        component={SalesStack} 
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <ProfileButton navigation={navigation} />
              <LogoutButton navigation={navigation} />
            </View>
          ),
        }}
      />
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
            case 'Profile': iconName = 'person'; break;
            default: iconName = 'home';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#178556',
        tabBarInactiveTintColor: '#90a5a0',
        tabBarStyle: {
          backgroundColor: '#152d2a',
          borderTopColor: '#178556',
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={StaffDashboardScreen} 
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <ProfileButton navigation={navigation} />
              <LogoutButton navigation={navigation} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="POS" 
        component={POSStack} 
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <ProfileButton navigation={navigation} />
              <LogoutButton navigation={navigation} />
            </View>
          ),
        }}
      />
      <Tab.Screen 
        name="Sales" 
        component={SalesStack} 
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row' }}>
              <ProfileButton navigation={navigation} />
              <LogoutButton navigation={navigation} />
            </View>
          ),
        }}
      />
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
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#152d2a' 
      }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 3,
            borderColor: '#178556',
            borderTopColor: 'transparent',
            marginBottom: 12,
            animation: 'spin 1s linear infinite',
          }} />
          <Text style={{ color: '#90a5a0', fontSize: 16 }}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!currentUser) {
    console.log('🔐 No user - showing Login');
    return (
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          cardStyle: { backgroundColor: '#152d2a' }
        }}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
        />
      </Stack.Navigator>
    );
  }

  if (userRole === 'restricted') {
    console.log('🚫 User is restricted');
    return (
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          cardStyle: { backgroundColor: '#152d2a' }
        }}
      >
        <Stack.Screen 
          name="Restricted" 
          component={RestrictedScreen} 
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