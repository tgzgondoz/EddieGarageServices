import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert
} from 'react-native';
import { database } from '../config/firebase';
import { ref, onValue, off, query, orderByChild, limitToLast } from 'firebase/database';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function SalesHistoryScreen() {
  const [sales, setSales] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up real-time listener for sales
    const salesRef = ref(database, 'sales');
    
    const unsubscribe = onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object to array and sort by timestamp
        const salesData = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        
        // Sort by timestamp (newest first)
        salesData.sort((a, b) => {
          const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
          const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
          return dateB - dateA;
        });
        
        // Calculate total revenue
        let revenue = 0;
        salesData.forEach(sale => {
          revenue += sale.total || 0;
        });
        
        setSales(salesData);
        setTotalRevenue(revenue);
      } else {
        setSales([]);
        setTotalRevenue(0);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching sales:', error);
      Alert.alert('Error', 'Failed to fetch sales history');
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => off(salesRef);
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const renderSale = ({ item }) => (
    <View style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <Text style={styles.saleDate}>
          {formatDate(item.timestamp)}
        </Text>
        <Text style={styles.saleTotal}>
          ${item.total?.toFixed(2) || '0.00'}
        </Text>
      </View>
      <Text style={styles.saleItems}>
        Items: {item.items?.length || 0} products
      </Text>
      {item.items && item.items.map((product, index) => (
        <View key={index} style={styles.saleItemDetail}>
          <Text style={styles.saleItemName}>{product.name || 'Unknown'}</Text>
          <Text style={styles.saleItemQty}>x{product.quantity || 0}</Text>
          <Text style={styles.saleItemPrice}>
            ${((product.price || 0) * (product.quantity || 0)).toFixed(2)}
          </Text>
        </View>
      ))}
    </View>
  );

  if (loading && sales.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>Loading sales history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Sales</Text>
          <Text style={styles.summaryValue}>{sales.length}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
          <Text style={styles.summaryValue}>${totalRevenue.toFixed(2)}</Text>
        </View>
      </View>
      <FlatList
        data={sales}
        renderItem={renderSale}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="receipt" size={60} color="#ccc" />
            <Text style={styles.emptyText}>No sales recorded yet</Text>
            <Text style={styles.emptySubText}>Sales will appear here once you process checkout</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b00',
    marginTop: 5,
  },
  list: {
    padding: 15,
  },
  saleCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  saleDate: {
    fontSize: 14,
    color: '#666',
  },
  saleTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b00',
  },
  saleItems: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  saleItemDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  saleItemName: {
    flex: 2,
    fontSize: 14,
    color: '#333',
  },
  saleItemQty: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  saleItemPrice: {
    flex: 1,
    fontSize: 14,
    color: '#ff6b00',
    textAlign: 'right',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
});