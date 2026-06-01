import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

import LoginScreen from '../screens/LoginScreen';
import POSScreen from '../screens/POSScreen';
import InventoryStack from './InventoryStack';
import ProductStack from './ProductStack';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import SalesHistoryScreen from '../screens/SalesHistoryScreen';
import RestrictedScreen from '../screens/RestrictedScreen'; // Make sure this line exists

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();


function MainTabs() {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'POS') {
            iconName = 'point-of-sale';
          } else if (route.name === 'Inventory') {
            iconName = 'inventory';
          } else if (route.name === 'Products') {
            iconName = 'shopping-cart';
          } else if (route.name === 'Admin') {
            iconName = 'admin-panel-settings';
          } else if (route.name === 'Sales') {
            iconName = 'history';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ff6b00',
        tabBarInactiveTintColor: 'gray',
        headerStyle: {
          backgroundColor: '#ff6b00',
        },
        headerTintColor: '#fff',
      })}
    >
      <Tab.Screen name="POS" component={POSScreen} />
      <Tab.Screen name="Inventory" component={InventoryStack} />
      <Tab.Screen name="Products" component={ProductStack} />
      <Tab.Screen name="Sales" component={SalesHistoryScreen} />
      {isAdmin && (
        <Tab.Screen name="Admin" component={AdminDashboardScreen} />
      )}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { currentUser, userRole } = useAuth();

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

  return <MainTabs />;
}