import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert
} from 'react-native';
import { collection, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function SalesHistoryScreen() {
  const [sales, setSales] = useState([]);
  const [expandedSale, setExpandedSale] = useState(null);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const q = query(collection(db, 'sales'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      const salesData = [];
      querySnapshot.forEach((doc) => {
        salesData.push({ id: doc.id, ...doc.data() });
      });
      setSales(salesData);
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  };

  const deleteSale = async (saleId) => {
    Alert.alert(
      'Delete Sale Record',
      'Are you sure you want to delete this sale record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'sales', saleId));
              fetchSales();
              Alert.alert('Success', 'Sale record deleted');
            } catch (error) {
              console.error('Error deleting sale:', error);
              Alert.alert('Error', 'Failed to delete sale record');
            }
          }
        }
      ]
    );
  };

  const getTotalRevenue = () => {
    return sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
  };

  const renderSaleItem = ({ item }) => (
    <View style={styles.saleCard}>
      <TouchableOpacity
        style={styles.saleHeader}
        onPress={() => setExpandedSale(expandedSale === item.id ? null : item.id)}
      >
        <View>
          <Text style={styles.saleDate}>
            {item.timestamp?.toDate().toLocaleString()}
          </Text>
          <Text style={styles.saleItemsCount}>
            {item.items?.length} items
          </Text>
        </View>
        <View style={styles.saleRight}>
          <Text style={styles.saleTotal}>${item.total?.toFixed(2)}</Text>
          <Icon
            name={expandedSale === item.id ? 'expand-less' : 'expand-more'}
            size={24}
            color="#666"
          />
        </View>
      </TouchableOpacity>

      {expandedSale === item.id && (
        <View style={styles.saleDetails}>
          <Text style={styles.detailsTitle}>Items:</Text>
          {item.items?.map((cartItem, idx) => (
            <View key={idx} style={styles.detailItem}>
              <Text style={styles.itemName}>
                {cartItem.name} x {cartItem.quantity}
              </Text>
              <Text style={styles.itemPrice}>
                ${(cartItem.price * cartItem.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          <View style={styles.detailTotal}>
            <Text style={styles.detailTotalText}>Total:</Text>
            <Text style={styles.detailTotalAmount}>${item.total?.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteSale(item.id)}
          >
            <Icon name="delete" size={20} color="#f44336" />
            <Text style={styles.deleteButtonText}>Delete Record</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Total Revenue</Text>
        <Text style={styles.summaryAmount}>${getTotalRevenue().toFixed(2)}</Text>
        <Text style={styles.summaryCount}>Total Sales: {sales.length}</Text>
      </View>

      <FlatList
        data={sales}
        renderItem={renderSaleItem}
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
  summary: {
    backgroundColor: '#ff6b00',
    padding: 20,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    color: 'white',
    marginBottom: 5,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  summaryCount: {
    fontSize: 14,
    color: 'white',
  },
  list: {
    padding: 10,
  },
  saleCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  saleDate: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  saleItemsCount: {
    fontSize: 12,
    color: '#666',
  },
  saleRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b00',
    marginRight: 10,
  },
  saleDetails: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 15,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    color: '#666',
  },
  detailTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6b00',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#f44336',
    marginLeft: 5,
  },
});