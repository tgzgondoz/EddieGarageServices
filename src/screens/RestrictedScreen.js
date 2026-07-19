import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const RestrictedScreen = ({ navigation, screenName }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      {/* Lock Icon with Animation Effect */}
      <View style={styles.iconContainer}>
        <View style={styles.iconBackground}>
          <Icon name="lock-closed" size={56} color="#000f3f" />
        </View>
        <View style={styles.iconRing} />
        <View style={[styles.iconRing, styles.iconRing2]} />
      </View>

      {/* Title and Message */}
      <View style={styles.content}>
        <Text style={styles.title}>Access Restricted</Text>
        <View style={styles.divider} />
        <Text style={styles.message}>
          The <Text style={styles.highlight}>{screenName}</Text> section is only 
          available for users with <Text style={styles.highlight}>Administrator</Text> privileges.
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]}
          onPress={() => navigation.navigate('POS')}
          activeOpacity={0.8}
        >
          <Icon name="cart-outline" size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Go to POS</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Icon name="arrow-back-outline" size={18} color="#6B7280" />
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { bottom: 20 + insets.bottom }]}>
        <Icon name="shield-checkmark-outline" size={14} color="#9CA3AF" />
        <Text style={styles.footerText}>Secure access • Admin only</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#000f3f15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000f3f30',
  },
  iconRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#000f3f20',
    top: -10,
    left: -10,
  },
  iconRing2: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: '#000f3f10',
    top: -20,
    left: -20,
  },
  content: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  divider: {
    width: 50,
    height: 3,
    backgroundColor: '#000f3f',
    borderRadius: 2,
    marginBottom: 14,
  },
  message: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  highlight: {
    fontWeight: '700',
    color: '#000f3f',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 280,
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#000f3f',
    shadowColor: '#000f3f',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});

export default RestrictedScreen;