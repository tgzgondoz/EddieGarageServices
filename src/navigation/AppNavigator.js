import React from 'react';
import { View } from 'react-native'; // ✅ ADD THIS IMPORT
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
function LogoutButton() {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
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
    </Stack.Navigator>
  );
}

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

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch(route.name) {
            case 'POS': iconName = 'point-of-sale'; break;
            case 'Inventory': iconName = 'inventory'; break;
            case 'Products': iconName = 'shopping-cart'; break;
            case 'Admin': iconName = 'admin-panel-settings'; break;
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
            <LogoutButton />
          </View>
        ),
      })}
    >
      <Tab.Screen name="POS" component={POSScreen} />
      <Tab.Screen name="Inventory" component={InventoryStack} />
      <Tab.Screen name="Products" component={ProductStack} />
      <Tab.Screen name="Sales" component={SalesHistoryScreen} />
      <Tab.Screen name="Admin" component={AdminDashboardScreen} />
    </Tab.Navigator>
  );
}

function StaffTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch(route.name) {
            case 'POS': iconName = 'point-of-sale'; break;
            case 'Products': iconName = 'shopping-cart'; break;
            case 'Sales': iconName = 'history'; break;
            case 'Dashboard': iconName = 'dashboard'; break;
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
            <LogoutButton />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={StaffDashboardScreen} />
      <Tab.Screen name="POS" component={POSScreen} />
      <Tab.Screen name="Products" component={ProductStack} />
      <Tab.Screen name="Sales" component={SalesHistoryScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  if (!currentUser) {
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

  // Admin gets full access, staff gets limited access
  if (userRole === 'admin') {
    return <AdminTabs />;
  } else {
    return <StaffTabs />;
  }
}