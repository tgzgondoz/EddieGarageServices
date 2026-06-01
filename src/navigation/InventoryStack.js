import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import InventoryScreen from '../screens/InventoryScreen';
import AddEditProductScreen from '../screens/AddEditProductScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';

const Stack = createStackNavigator();

export default function InventoryStack() {
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