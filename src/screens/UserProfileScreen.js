import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function UserProfileScreen({ navigation }) {
  const { userData, updateUserProfile, logout } = useAuth();
  const [displayName, setDisplayName] = useState(userData?.displayName || '');
  const [phone, setPhone] = useState(userData?.phone || '');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    const result = await updateUserProfile({
      displayName,
      phone,
      updatedAt: new Date()
    });
    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Icon name="person" size={80} color="#FFFFFF" />
        </View>
        <Text style={styles.email}>{userData?.email}</Text>
        <View style={[styles.roleBadge, userData?.role === 'admin' ? styles.adminBadge : styles.staffBadge]}>
          <Text style={styles.roleText}>{userData?.role?.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.inputDisabled]}
          value={displayName}
          onChangeText={setDisplayName}
          editable={isEditing}
          placeholder="Enter your name"
          placeholderTextColor="#90a5a0"
        />

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={[styles.input, !isEditing && styles.inputDisabled]}
          value={phone}
          onChangeText={setPhone}
          editable={isEditing}
          placeholder="Enter your phone number"
          placeholderTextColor="#90a5a0"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={userData?.email}
          editable={false}
          placeholderTextColor="#90a5a0"
        />

        {isEditing ? (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setIsEditing(false);
                setDisplayName(userData?.displayName || '');
                setPhone(userData?.phone || '');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleUpdate}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Icon name="edit" size={20} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Icon name="logout" size={20} color="#f44336" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#152d2a',
  },
  header: {
    backgroundColor: '#178556',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#152d2a',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  email: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  roleBadge: {
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
  },
  adminBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  staffBadge: {
    backgroundColor: 'rgba(21,45,42,0.5)',
  },
  roleText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#90a5a0',
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#178556',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#90a5a0',
    fontSize: 16,
    color: '#152d2a',
  },
  inputDisabled: {
    backgroundColor: '#90a5a0',
    color: '#152d2a',
    opacity: 0.8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#152d2a',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#178556',
  },
  cancelButtonText: {
    color: '#90a5a0',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#178556',
    marginLeft: 10,
    shadowColor: '#178556',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#178556',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    shadowColor: '#178556',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#f44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  logoutButtonText: {
    color: '#f44336',
    fontWeight: 'bold',
    marginLeft: 10,
  },
});