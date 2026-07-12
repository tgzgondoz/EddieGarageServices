import { getDatabaseInstance, ref, set, push, onValue, update, remove } from '../config/firebase';

// Simple in-memory session storage
let currentSessionUser = null;

// Default credentials for Eddie Tuckshop
const DEFAULT_ADMIN = {
  email: 'admin@eddietuckshop.com',
  password: 'Eddie@Admin2026#Secure',
  fullName: 'Eddie Admin',
  role: 'admin'
};

const DEFAULT_STAFF = {
  email: 'staff@eddietuckshop.com',
  password: 'Eddie@Staff2026#Strong',
  fullName: 'Eddie Staff',
  role: 'cashier'
};

class AuthService {
  static async initializeDefaultUsers() {
    try {
      const db = getDatabaseInstance();
      const usersRef = ref(db, 'users');
      
      // Check if users already exist
      let users = [];
      await new Promise((resolve) => {
        onValue(usersRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            users = Object.values(data);
          }
          resolve();
        }, { onlyOnce: true });
      });
      
      // Check if admin exists
      const adminExists = users.some(user => user.email === DEFAULT_ADMIN.email);
      if (!adminExists) {
        console.log('Creating default admin user...');
        const adminRef = push(usersRef);
        const adminData = {
          id: adminRef.key,
          ...DEFAULT_ADMIN,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          isActive: true
        };
        await set(adminRef, adminData);
        console.log('Default admin created successfully');
      }
      
      // Check if staff exists
      const staffExists = users.some(user => user.email === DEFAULT_STAFF.email);
      if (!staffExists) {
        console.log('Creating default staff user...');
        const staffRef = push(usersRef);
        const staffData = {
          id: staffRef.key,
          ...DEFAULT_STAFF,
          createdAt: new Date().toISOString(),
          lastLogin: null,
          isActive: true
        };
        await set(staffRef, staffData);
        console.log('Default staff created successfully');
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing default users:', error);
      throw error;
    }
  }
  
  static async registerUser(email, password, fullName, role) {
    try {
      const db = getDatabaseInstance();
      const usersRef = ref(db, 'users');
      
      // Check if user already exists
      let userExists = false;
      let usersList = [];
      
      await new Promise((resolve) => {
        onValue(usersRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            usersList = Object.values(data);
            userExists = usersList.some(user => user.email === email);
          }
          resolve();
        }, { onlyOnce: true });
      });
      
      if (userExists) {
        throw new Error('User already exists');
      }
      
      const newUserRef = push(usersRef);
      const userData = {
        id: newUserRef.key,
        email,
        fullName,
        role, // 'admin' or 'cashier'
        createdAt: new Date().toISOString(),
        lastLogin: null,
        isActive: true,
        password // In production, you should hash this!
      };
      
      await set(newUserRef, userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }
  
  static async loginUser(email, password) {
    try {
      // Ensure default users exist
      await this.initializeDefaultUsers();
      
      const db = getDatabaseInstance();
      const usersRef = ref(db, 'users');
      let user = null;
      
      await new Promise((resolve) => {
        onValue(usersRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const foundUser = Object.values(data).find(u => u.email === email && u.password === password);
            if (foundUser) {
              user = foundUser;
            }
          }
          resolve();
        }, { onlyOnce: true });
      });
      
      if (user && user.isActive) {
        // Update last login
        const userRef = ref(db, `users/${user.id}`);
        await update(userRef, { lastLogin: new Date().toISOString() });
        
        // Store in memory session
        currentSessionUser = user;
        
        return { success: true, user };
      } else if (user && !user.isActive) {
        throw new Error('Account is deactivated');
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }
  
  static getCurrentSessionUser() {
    return currentSessionUser;
  }
  
  static async getUsers() {
    const db = getDatabaseInstance();
    const usersRef = ref(db, 'users');
    let users = [];
    
    await new Promise((resolve) => {
      onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          users = Object.values(data);
        }
        resolve();
      }, { onlyOnce: true });
    });
    
    return users;
  }
  
  static async updateUserRole(userId, newRole) {
    try {
      const db = getDatabaseInstance();
      const userRef = ref(db, `users/${userId}`);
      await update(userRef, { role: newRole, updatedAt: new Date().toISOString() });
      return true;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }
  
  static async toggleUserStatus(userId, isActive) {
    try {
      const db = getDatabaseInstance();
      const userRef = ref(db, `users/${userId}`);
      await update(userRef, { isActive, updatedAt: new Date().toISOString() });
      return true;
    } catch (error) {
      console.error('Error toggling user status:', error);
      throw error;
    }
  }
  
  static async deleteUser(userId) {
    try {
      const db = getDatabaseInstance();
      const userRef = ref(db, `users/${userId}`);
      await remove(userRef);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
  
  static logout() {
    currentSessionUser = null;
    return true;
  }
  
  // Helper method to reset default users (useful for testing)
  static async resetDefaultUsers() {
    try {
      const db = getDatabaseInstance();
      const usersRef = ref(db, 'users');
      
      // Get all users
      let users = [];
      await new Promise((resolve) => {
        onValue(usersRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            users = Object.values(data);
          }
          resolve();
        }, { onlyOnce: true });
      });
      
      // Delete all existing users
      for (const user of users) {
        const userRef = ref(db, `users/${user.id}`);
        await remove(userRef);
      }
      
      // Recreate default users
      await this.initializeDefaultUsers();
      
      return true;
    } catch (error) {
      console.error('Error resetting default users:', error);
      throw error;
    }
  }
}

export default AuthService;