import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity
} from 'react-native';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function SalesHistoryScreen() {
  const [sales, setSales] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const q = query(collection(db, 'sales'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const salesData = [];
      let revenue = 0;
      querySnapshot.forEach((doc) => {
        const sale = { id: doc.id, ...doc.data() };
        salesData.push(sale);
        revenue += sale.total || 0;
      });
      setSales(salesData);
      setTotalRevenue(revenue);
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  };

  const renderSale = ({ item }) => (
    <View style={styles.saleCard}>
      <View style={styles.saleHeader}>
        <Text style={styles.saleDate}>
          {item.timestamp?.toDate().toLocaleString() || 'Unknown date'}
        </Text>
        <Text style={styles.saleTotal}>${item.total?.toFixed(2) || '0.00'}</Text>
      </View>
      <Text style={styles.saleItems}>
        Items: {item.items?.length || 0} products
      </Text>
      {item.items && item.items.map((product, index) => (
        <View key={index} style={styles.saleItemDetail}>
          <Text style={styles.saleItemName}>{product.name}</Text>
          <Text style={styles.saleItemQty}>x{product.quantity}</Text>
          <Text style={styles.saleItemPrice}>
            ${(product.price * product.quantity).toFixed(2)}
          </Text>
        </View>
      ))}
    </View>
  );

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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    marginBottom: 10,
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
});