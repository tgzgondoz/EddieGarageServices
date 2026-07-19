import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AuthService from '../services/AuthService';
import { getDatabaseInstance, ref, onValue } from '../config/firebase';

const { width, height } = Dimensions.get('window');

const AdminDashboardScreen = ({ user, onLogout }) => {
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    admins: 0,
    cashiers: 0,
    activeUsers: 0
  });
  
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'cashier'
  });

  useEffect(() => {
    loadUsers();
    loadSystemStats();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const usersList = await AuthService.getUsers();
    setUsers(usersList);
    calculateStats(usersList);
    setLoading(false);
  };

  const calculateStats = (usersList) => {
    const totalUsers = usersList.length;
    const admins = usersList.filter(u => u.role === 'admin').length;
    const cashiers = usersList.filter(u => u.role === 'cashier').length;
    const activeUsers = usersList.filter(u => u.isActive).length;
    setStats({ totalUsers, admins, cashiers, activeUsers });
  };

  const loadSystemStats = () => {
    const db = getDatabaseInstance();
    
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      const products = data ? Object.keys(data).length : 0;
    });
    
    const salesRef = ref(db, 'sales');
    onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      const sales = data ? Object.keys(data).length : 0;
    });
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.fullName) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      await AuthService.registerUser(newUser.email, newUser.password, newUser.fullName, newUser.role);
      Alert.alert('Success', 'User added successfully');
      setModalVisible(false);
      setNewUser({ email: '', password: '', fullName: '', role: 'cashier' });
      loadUsers();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await AuthService.toggleUserStatus(userId, !currentStatus);
      Alert.alert('Success', `User ${!currentStatus ? 'activated' : 'deactivated'}`);
      loadUsers();
    } catch (error) {
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    Alert.alert(
      'Change Role',
      `Change user role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await AuthService.updateUserRole(userId, newRole);
              Alert.alert('Success', 'Role updated successfully');
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to update role');
            }
          }
        }
      ]
    );
  };

  const handleDeleteUser = async (userId, userName) => {
    if (userId === user.id) {
      Alert.alert('Error', 'You cannot delete your own account');
      return;
    }
    
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.deleteUser(userId);
              Alert.alert('Success', 'User deleted successfully');
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={[styles.userAvatar, item.role === 'admin' ? styles.adminAvatar : styles.cashierAvatar]}>
          <Text style={styles.avatarText}>{getInitials(item.fullName)}</Text>
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.fullName}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <View style={styles.userMeta}>
            <View style={[styles.roleBadge, item.role === 'admin' ? styles.adminBadge : styles.cashierBadge]}>
              <Icon 
                name={item.role === 'admin' ? 'shield-checkmark' : 'person'} 
                size={10} 
                color={item.role === 'admin' ? '#EF4444' : '#10B981'} 
              />
              <Text style={[styles.roleText, item.role === 'admin' ? styles.adminRoleText : styles.cashierRoleText]}>
                {item.role?.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.statusBadge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}>
              <View style={[styles.statusDot, item.isActive ? styles.activeDot : styles.inactiveDot]} />
              <Text style={[styles.statusText, item.isActive ? styles.activeStatusText : styles.inactiveStatusText]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.userActions}>
        {item.role !== 'admin' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.promoteBtn]}
            onPress={() => handleChangeRole(item.id, 'admin')}
            activeOpacity={0.7}
          >
            <Icon name="arrow-up" size={12} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Promote</Text>
          </TouchableOpacity>
        )}
        {item.role !== 'cashier' && item.id !== user.id && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.demoteBtn]}
            onPress={() => handleChangeRole(item.id, 'cashier')}
            activeOpacity={0.7}
          >
            <Icon name="arrow-down" size={12} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Demote</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionBtn, item.isActive ? styles.deactivateBtn : styles.activateBtn]}
          onPress={() => handleToggleStatus(item.id, item.isActive)}
          activeOpacity={0.7}
        >
          <Icon name={item.isActive ? "close" : "checkmark"} size={12} color="#FFFFFF" />
          <Text style={styles.actionBtnText}>{item.isActive ? 'Deactivate' : 'Activate'}</Text>
        </TouchableOpacity>
        {item.id !== user.id && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={() => handleDeleteUser(item.id, item.fullName)}
            activeOpacity={0.7}
          >
            <Icon name="trash" size={12} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Fixed Header Component
  const FixedHeader = () => (
    <View style={[styles.fixedHeaderContainer, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            {stats.totalUsers} users • {stats.activeUsers} active
          </Text>
        </View>
        <TouchableOpacity style={styles.headerAction} onPress={loadUsers}>
          <Icon name="refresh-outline" size={20} color="#0D5335" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, styles.totalIcon]}>
            <Icon name="people-outline" size={18} color="#0D5335" />
          </View>
          <Text style={styles.statValue}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, styles.adminIcon]}>
            <Icon name="shield-checkmark-outline" size={18} color="#EF4444" />
          </View>
          <Text style={[styles.statValue, styles.adminStat]}>{stats.admins}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, styles.cashierIcon]}>
            <Icon name="person-outline" size={18} color="#10B981" />
          </View>
          <Text style={[styles.statValue, styles.cashierStat]}>{stats.cashiers}</Text>
          <Text style={styles.statLabel}>Cashiers</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, styles.activeIcon]}>
            <Icon name="checkmark-circle-outline" size={18} color="#0D5335" />
          </View>
          <Text style={[styles.statValue, styles.activeStat]}>{stats.activeUsers}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
        <ActivityIndicator size="large" color="#0D5335" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <FixedHeader />

      <View style={styles.listHeader}>
        <View style={styles.listHeaderLeft}>
          <Icon name="people-outline" size={18} color="#0D5335" />
          <Text style={styles.listTitle}>User Management</Text>
        </View>
        <TouchableOpacity style={styles.addUserBtn} onPress={() => setModalVisible(true)}>
          <Icon name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addUserText}>Add User</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: 20 + insets.bottom }
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="people-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubtext}>Add users to get started</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        style={styles.flatList}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Icon name="person-add-outline" size={22} color="#0D5335" />
              <Text style={styles.modalTitle}>Add New User</Text>
            </View>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.modalForm} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
          >
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Icon name="person-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={newUser.fullName}
                  onChangeText={(text) => setNewUser({ ...newUser, fullName: text })}
                  placeholder="Enter full name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <Icon name="mail-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={newUser.email}
                  onChangeText={(text) => setNewUser({ ...newUser, email: text })}
                  placeholder="Enter email"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Icon name="lock-closed-outline" size={18} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={newUser.password}
                  onChangeText={(text) => setNewUser({ ...newUser, password: text })}
                  placeholder="Enter password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.roleSelector}>
                <TouchableOpacity
                  style={[styles.roleOption, newUser.role === 'admin' && styles.roleOptionActive]}
                  onPress={() => setNewUser({ ...newUser, role: 'admin' })}
                >
                  <Icon name="shield-checkmark-outline" size={16} color={newUser.role === 'admin' ? '#FFFFFF' : '#6B7280'} />
                  <Text style={[styles.roleOptionText, newUser.role === 'admin' && styles.roleOptionTextActive]}>
                    Admin
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, newUser.role === 'cashier' && styles.roleOptionActive]}
                  onPress={() => setNewUser({ ...newUser, role: 'cashier' })}
                >
                  <Icon name="person-outline" size={16} color={newUser.role === 'cashier' ? '#FFFFFF' : '#6B7280'} />
                  <Text style={[styles.roleOptionText, newUser.role === 'cashier' && styles.roleOptionTextActive]}>
                    Cashier
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleAddUser} activeOpacity={0.8}>
              <Icon name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Add User</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  flatList: {
    flex: 1,
  },
  fixedHeaderContainer: {
    backgroundColor: '#F3F4F6',
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  headerAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0D533515',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0D533530',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  totalIcon: {
    backgroundColor: '#0D533515',
  },
  adminIcon: {
    backgroundColor: '#EF444415',
  },
  cashierIcon: {
    backgroundColor: '#10B98115',
  },
  activeIcon: {
    backgroundColor: '#0D533515',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 1,
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  adminStat: {
    color: '#EF4444',
  },
  cashierStat: {
    color: '#10B981',
  },
  activeStat: {
    color: '#0D5335',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  addUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D5335',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    shadowColor: '#0D5335',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addUserText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 12,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  userInfo: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  adminAvatar: {
    backgroundColor: '#EF444415',
  },
  cashierAvatar: {
    backgroundColor: '#0D533515',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D5335',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  userMeta: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  adminBadge: {
    backgroundColor: '#EF444415',
  },
  cashierBadge: {
    backgroundColor: '#10B98115',
  },
  roleText: {
    fontSize: 9,
    fontWeight: '600',
  },
  adminRoleText: {
    color: '#EF4444',
  },
  cashierRoleText: {
    color: '#10B981',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  activeBadge: {
    backgroundColor: '#10B98115',
  },
  inactiveBadge: {
    backgroundColor: '#F3F4F6',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  activeDot: {
    backgroundColor: '#10B981',
  },
  inactiveDot: {
    backgroundColor: '#9CA3AF',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '600',
  },
  activeStatusText: {
    color: '#10B981',
  },
  inactiveStatusText: {
    color: '#6B7280',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 6,
    gap: 3,
  },
  promoteBtn: {
    backgroundColor: '#0D5335',
  },
  demoteBtn: {
    backgroundColor: '#F59E0B',
  },
  deactivateBtn: {
    backgroundColor: '#EF4444',
  },
  activateBtn: {
    backgroundColor: '#10B981',
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalForm: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  inputIcon: {
    paddingLeft: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#111827',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  roleOptionActive: {
    backgroundColor: '#0D5335',
    borderColor: '#0D5335',
  },
  roleOptionText: {
    color: '#6B7280',
    fontWeight: '500',
    fontSize: 13,
  },
  roleOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#0D5335',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 20,
    gap: 6,
    shadowColor: '#0D5335',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 6,
  },
});

export default AdminDashboardScreen;