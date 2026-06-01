import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';
import AddEditProductScreen from '../screens/AddEditProductScreen'; // Changed from AddProductScreen to AddEditProductScreen

const Stack = createStackNavigator();

export default function ProductStack() {
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
        name="AddEditProduct"  // Changed from AddProduct to AddEditProduct
        component={AddEditProductScreen} 
        options={{ title: 'Add/Edit Product' }}
      />
    </Stack.Navigator>
  );
}