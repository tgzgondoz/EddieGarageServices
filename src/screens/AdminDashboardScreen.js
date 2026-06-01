import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function AdminDashboardScreen({ navigation }) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    totalSales: 0,
    revenue: 0,
  });
  const [recentSales, setRecentSales] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch products
      const productsQuery = query(collection(db, 'products'));
      const productsSnapshot = await getDocs(productsQuery);
      const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const totalProducts = products.length;
      const lowStock = products.filter(p => p.quantity <= 10).length;

      // Fetch sales
      const salesQuery = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(10));
      const salesSnapshot = await getDocs(salesQuery);
      const sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const totalSales = sales.length;
      const revenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);

      setStats({ totalProducts, lowStock, totalSales, revenue });
      setRecentSales(sales);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const StatCard = ({ title, value, icon, color, onPress }) => (
    <TouchableOpacity style={[styles.statCard, { borderLeftColor: color }]} onPress={onPress}>
      <Icon name={icon} size={30} color={color} />
      <View style={styles.statInfo}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.statsContainer}>
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon="shopping-cart"
          color="#4CAF50"
          onPress={() => navigation.navigate('Inventory')}
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStock}
          icon="warning"
          color="#ff9800"
          onPress={() => navigation.navigate('Inventory')}
        />
        <StatCard
          title="Today's Sales"
          value={stats.totalSales}
          icon="receipt"
          color="#2196F3"
          onPress={() => navigation.navigate('Sales')}
        />
        <StatCard
          title="Revenue"
          value={`$${stats.revenue.toFixed(2)}`}
          icon="attach-money"
          color="#ff6b00"
          onPress={() => navigation.navigate('Sales')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Admin Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CategoryManagement')}
          >
            <Icon name="category" size={40} color="#ff6b00" />
            <Text style={styles.actionText}>Manage Categories</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ProductManagement')}
          >
            <Icon name="edit" size={40} color="#ff6b00" />
            <Text style={styles.actionText}>Manage Products</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('SalesHistory')}
          >
            <Icon name="history" size={40} color="#ff6b00" />
            <Text style={styles.actionText}>Sales Reports</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Sales</Text>
        {recentSales.map((sale, index) => (
          <View key={index} style={styles.saleItem}>
            <View style={styles.saleHeader}>
              <Text style={styles.saleDate}>
                {sale.timestamp?.toDate().toLocaleString()}
              </Text>
              <Text style={styles.saleTotal}>${sale.total?.toFixed(2)}</Text>
            </View>
            <Text style={styles.saleItems}>{sale.items?.length} items sold</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  statCard: {
    backgroundColor: 'white',
    width: '48%',
    margin: '1%',
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statInfo: {
    marginLeft: 15,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginTop: 20,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: 'white',
    flex: 1,
    margin: 5,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    marginTop: 10,
    fontSize: 12,
    textAlign: 'center',
  },
  saleItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  saleDate: {
    fontSize: 12,
    color: '#666',
  },
  saleTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6b00',
  },
  saleItems: {
    fontSize: 12,
    color: '#666',
  },
});