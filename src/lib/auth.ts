
// Frontend-only authentication simulation
// In a real app, these would be API calls to your backend
import { sendVerificationEmail } from './email';

export interface User {
  id: number;
  email: string;
  name: string;
  company?: string;
  city?: string;
  country?: string;
  is_verified: boolean;
  created_at: Date;
  auth_provider?: 'email' | 'google' | 'microsoft';
  provider_id?: string;
}

// Simulated database using localStorage
const getStoredUsers = (): any[] => {
  const users = localStorage.getItem('mailskrap_users');
  return users ? JSON.parse(users) : [];
};

const storeUsers = (users: any[]) => {
  localStorage.setItem('mailskrap_users', JSON.stringify(users));
};

const getStoredOTPs = (): any[] => {
  const otps = localStorage.getItem('mailskrap_otps');
  return otps ? JSON.parse(otps) : [];
};

const storeOTPs = (otps: any[]) => {
  localStorage.setItem('mailskrap_otps', JSON.stringify(otps));
};

// Initialize default admin user
const initializeDefaultUsers = () => {
  const users = getStoredUsers();
  if (users.length === 0) {
    const defaultAdmin = {
      id: 1,
      email: 'admin@mailskrap.com',
      name: 'Admin User',
      company: 'MailSkrap',
      city: 'New York',
      country: 'United States',
      password_hash: 'hashed_admin123_' + Date.now(),
      is_verified: true,
      created_at: new Date(),
      verification_otp: null,
      otp_expires_at: null
    };
    
    users.push(defaultAdmin);
    storeUsers(users);
    console.log('Default admin user created: admin@mailskrap.com / admin123');
  }
};

// Call initialization on module load
initializeDefaultUsers();

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Simple hash simulation (NOT secure - for demo only)
export const hashPassword = async (password: string): Promise<string> => {
  // In a real app, this would use proper bcrypt hashing
  return `hashed_${password}_${Date.now()}`;
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  // Simple comparison for demo purposes
  if (hashedPassword.includes('admin123') && password === 'admin123') {
    return true;
  }
  return hashedPassword.includes(password);
};

export const generateJWT = (userId: number): string => {
  // Simple token simulation (NOT secure - for demo only)
  return `token_${userId}_${Date.now()}`;
};

export const createUser = async (userData: {
  email: string;
  name: string;
  company?: string;
  city?: string;
  country?: string;
  password: string;
}) => {
  const users = getStoredUsers();
  
  // Check if user already exists
  const existingUser = users.find(u => u.email === userData.email);
  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  const hashedPassword = await hashPassword(userData.password);
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const newUser = {
    id: users.length + 1,
    email: userData.email,
    name: userData.name,
    company: userData.company || null,
    city: userData.city || null,
    country: userData.country || null,
    password_hash: hashedPassword,
    is_verified: false,
    created_at: new Date(),
    verification_otp: otp,
    otp_expires_at: otpExpiry
  };

  users.push(newUser);
  storeUsers(users);

  // Store OTP for verification
  const otps = getStoredOTPs();
  otps.push({
    email: userData.email,
    otp: otp,
    expires_at: otpExpiry
  });
  storeOTPs(otps);

  // Try to send actual email, fall back to console/alert for demo
  try {
    await sendVerificationEmail(userData.email, otp, userData.name);
    console.log(`📧 OTP sent to ${userData.email}: ${otp}`);
  } catch (emailError) {
    console.log(`❌ Email sending failed, falling back to demo mode`);
    console.log(`🔐 OTP for ${userData.email}: ${otp}`);
    console.log(`⏰ OTP expires at: ${otpExpiry.toLocaleTimeString()}`);
    
    // Show OTP in alert for demo purposes
    alert(`Demo Mode: Your OTP is ${otp}\n\nIn production, this would be sent to your email: ${userData.email}`);
  }
  
  return { success: true, message: 'User created successfully' };
};

export const verifyOTP = async (email: string, otp: string) => {
  const users = getStoredUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) {
    throw new Error('User not found');
  }

  if (user.verification_otp !== otp) {
    throw new Error('Invalid OTP');
  }

  if (new Date() > new Date(user.otp_expires_at)) {
    throw new Error('OTP has expired');
  }

  // Mark user as verified
  user.is_verified = true;
  user.verification_otp = null;
  user.otp_expires_at = null;
  
  storeUsers(users);

  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
};

export const authenticateUser = async (email: string, password: string) => {
  const users = getStoredUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.is_verified) {
    throw new Error('Email not verified. Please verify your email before signing in.');
  }

  const isValidPassword = await comparePassword(password, user.password_hash);

  if (!isValidPassword) {
    throw new Error('Invalid password');
  }

  const token = generateJWT(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      city: user.city,
      country: user.country,
      is_verified: user.is_verified
    },
    token
  };
};

export const getUserByEmail = async (email: string) => {
  const users = getStoredUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    company: user.company,
    city: user.city,
    country: user.country,
    is_verified: user.is_verified
  };
};

export const logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  console.log('User logged out successfully');
};

// Google OAuth Functions
export const handleGoogleLogin = async (credentialResponse: any) => {
  try {
    // Decode the JWT token from Google
    const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
    
    const users = getStoredUsers();
    let user = users.find(u => u.email === payload.email);
    
    if (!user) {
      // Create new user from Google data
      user = {
        id: users.length + 1,
        email: payload.email,
        name: payload.name,
        company: '',
        city: '',
        country: '',
        password_hash: '', // No password for OAuth users
        is_verified: true, // Google accounts are pre-verified
        created_at: new Date(),
        verification_otp: null,
        otp_expires_at: null,
        auth_provider: 'google',
        provider_id: payload.sub
      };
      
      users.push(user);
      storeUsers(users);
    } else {
      // Update existing user with Google provider info
      user.auth_provider = 'google';
      user.provider_id = payload.sub;
      user.is_verified = true;
      storeUsers(users);
    }
    
    const token = generateJWT(user.id);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        city: user.city,
        country: user.country,
        is_verified: user.is_verified
      },
      token
    };
  } catch (error) {
    console.error('Google login error:', error);
    throw new Error('Google login failed');
  }
};

// Microsoft OAuth Functions
export const handleMicrosoftLogin = async (account: any) => {
  try {
    const users = getStoredUsers();
    let user = users.find(u => u.email === account.username);
    
    if (!user) {
      // Create new user from Microsoft data
      user = {
        id: users.length + 1,
        email: account.username,
        name: account.name || account.username.split('@')[0],
        company: '',
        city: '',
        country: '',
        password_hash: '', // No password for OAuth users
        is_verified: true, // Microsoft accounts are pre-verified
        created_at: new Date(),
        verification_otp: null,
        otp_expires_at: null,
        auth_provider: 'microsoft',
        provider_id: account.homeAccountId
      };
      
      users.push(user);
      storeUsers(users);
    } else {
      // Update existing user with Microsoft provider info
      user.auth_provider = 'microsoft';
      user.provider_id = account.homeAccountId;
      user.is_verified = true;
      storeUsers(users);
    }
    
    const token = generateJWT(user.id);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        city: user.city,
        country: user.country,
        is_verified: user.is_verified
      },
      token
    };
  } catch (error) {
    console.error('Microsoft login error:', error);
    throw new Error('Microsoft login failed');
  }
};
