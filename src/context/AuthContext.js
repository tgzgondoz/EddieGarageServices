import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

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
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          // Try to get user role from Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRole(userData.role || 'staff');
          } else {
            // If no user document, check email for demo
            if (user.email === 'admin@eddiegarage.com') {
              setUserRole('admin');
              // Create user document for admin
              await setDoc(userDocRef, {
                email: user.email,
                role: 'admin',
                createdAt: new Date()
              });
            } else if (user.email === 'staff@eddiegarage.com') {
              setUserRole('staff');
              // Create user document for staff
              await setDoc(userDocRef, {
                email: user.email,
                role: 'staff',
                createdAt: new Date()
              });
            } else {
              setUserRole('staff');
              await setDoc(userDocRef, {
                email: user.email,
                role: 'staff',
                createdAt: new Date()
              });
            }
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          // Fallback to email-based role
          if (user.email === 'admin@eddiegarage.com') {
            setUserRole('admin');
          } else {
            setUserRole('staff');
          }
        }
      } else {
        setUserRole('staff');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      setAuthError(null);
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Login error:', error.code, error.message);
      let errorMessage = error.message;
      
      // User-friendly error messages
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

  const register = async (email, password, role = 'staff') => {
    try {
      setAuthError(null);
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      
      // Create user document
      await setDoc(doc(db, 'users', result.user.uid), {
        email: email.trim(),
        role: role,
        createdAt: new Date()
      });
      
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
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    currentUser,
    userRole,
    login,
    register,
    logout,
    loading,
    authError,
    setAuthError
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}