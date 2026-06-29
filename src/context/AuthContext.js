import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { ref, set, get, update, child } from 'firebase/database';
import { auth, database } from '../config/firebase';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('staff');
  const [userData, setUserData] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [usersList, setUsersList] = useState([]);

  // Load users list for admin management
  const loadUsersList = async () => {
    try {
      const usersRef = ref(database, 'users');
      const snapshot = await get(usersRef);
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        const usersArray = Object.keys(usersData).map(key => ({
          id: key,
          ...usersData[key]
        }));
        setUsersList(usersArray);
        return usersArray;
      }
      return [];
    } catch (error) {
      console.error('Error loading users list:', error);
      return [];
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed - User:', user?.email);
      setCurrentUser(user);
      
      if (user) {
        try {
          // Get user data from Realtime Database
          const userRef = ref(database, `users/${user.uid}`);
          const snapshot = await get(userRef);
          
          if (snapshot.exists()) {
            const userData = snapshot.val();
            console.log('User data from Realtime Database:', userData);
            console.log('Role from Realtime Database:', userData.role);
            setUserRole(userData.role || 'staff');
            setUserData(userData);
          } else {
            // If no user data, check email for demo accounts
            let role = 'staff';
            console.log('Checking email for role:', user.email);
            
            if (user.email === 'admin@eddiegarage.com') {
              role = 'admin';
              console.log('Admin email detected - Setting role to admin');
            } else if (user.email === 'staff@eddiegarage.com') {
              role = 'staff';
              console.log('Staff email detected - Setting role to staff');
            }
            
            console.log('Final role determined:', role);
            setUserRole(role);
            
            // Create user data in Realtime Database
            const newUserData = {
              email: user.email,
              role: role,
              createdAt: new Date().toISOString(),
              displayName: user.displayName || '',
              phone: '',
              uid: user.uid,
              isActive: true
            };
            
            await set(ref(database, `users/${user.uid}`), newUserData);
            setUserData(newUserData);
            
            // Update users list
            await loadUsersList();
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          // Fallback to email-based role
          if (user.email === 'admin@eddiegarage.com') {
            console.log('Fallback: Setting role to admin');
            setUserRole('admin');
          } else {
            console.log('Fallback: Setting role to staff');
            setUserRole('staff');
          }
        }
      } else {
        console.log('No user logged in');
        setUserRole('staff');
        setUserData(null);
      }
      
      console.log('Final userRole state:', userRole);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      setAuthError(null);
      console.log('Attempting login with:', email);
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      console.log('Login successful:', result.user.email);
      
      // Get user role from Realtime Database
      const userRef = ref(database, `users/${result.user.uid}`);
      const snapshot = await get(userRef);
      
      let role = 'staff';
      if (snapshot.exists()) {
        const userData = snapshot.val();
        role = userData.role || 'staff';
        console.log('Role from Realtime Database after login:', role);
        setUserData(userData);
      } else {
        // Check email for demo accounts
        if (result.user.email === 'admin@eddiegarage.com') {
          role = 'admin';
          console.log('Admin login detected - Setting role to admin');
        } else if (result.user.email === 'staff@eddiegarage.com') {
          role = 'staff';
          console.log('Staff login detected - Setting role to staff');
        }
        
        // Create user data if it doesn't exist
        const newUserData = {
          email: result.user.email,
          role: role,
          createdAt: new Date().toISOString(),
          displayName: result.user.displayName || '',
          phone: '',
          uid: result.user.uid,
          isActive: true
        };
        await set(ref(database, `users/${result.user.uid}`), newUserData);
        setUserData(newUserData);
        await loadUsersList();
      }
      
      console.log('Setting userRole to:', role);
      setUserRole(role);
      
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Login error:', error.code, error.message);
      let errorMessage = error.message;
      
      switch (error.code) {
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password. Please try again.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your internet connection.';
          break;
        default:
          errorMessage = error.message;
      }
      
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (email, password, role = 'staff', displayName = '') => {
    try {
      setAuthError(null);
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      const userData = {
        email: email.trim(),
        role: role,
        displayName: displayName || email.split('@')[0],
        phone: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        uid: result.user.uid,
        isActive: true
      };
      
      // Save to Realtime Database
      await set(ref(database, `users/${result.user.uid}`), userData);
      await loadUsersList();
      
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Registration error:', error.code, error.message);
      let errorMessage = error.message;
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
          break;
        default:
          errorMessage = error.message;
      }
      
      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      setAuthError(null);
      await signOut(auth);
      setUserRole('staff');
      setUserData(null);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUserProfile = async (data) => {
    try {
      if (!currentUser) throw new Error('No user logged in');
      const userRef = ref(database, `users/${currentUser.uid}`);
      await update(userRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
      setUserData(prev => ({ ...prev, ...data }));
      await loadUsersList();
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUserRole = async (uid, newRole) => {
    try {
      const userRef = ref(database, `users/${uid}`);
      await update(userRef, {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      await loadUsersList();
      return { success: true };
    } catch (error) {
      console.error('Error updating user role:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteUser = async (uid) => {
    try {
      const userRef = ref(database, `users/${uid}`);
      await remove(userRef);
      await loadUsersList();
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    currentUser,
    userRole,
    userData,
    usersList,
    login,
    register,
    logout,
    loading,
    authError,
    setAuthError,
    updateUserProfile,
    updateUserRole,
    deleteUser,
    loadUsersList,
    isAdmin: userRole === 'admin',
    isStaff: userRole === 'staff'
  };

  console.log('AuthContext value - userRole:', userRole);
  console.log('AuthContext value - isAdmin:', value.isAdmin);
  console.log('AuthContext value - isStaff:', value.isStaff);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}