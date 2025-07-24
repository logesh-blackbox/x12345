import { supabase } from './supabaseClient.js';
import { toast } from './ui.js';

export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: error.message };
  }
};

export const signUp = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (error) throw error;
    
    return { success: true, data };
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: error.message };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear any local storage
    localStorage.removeItem('notes_cache');
    localStorage.removeItem('user_settings');
    
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    
    return { success: true, user };
  } catch (error) {
    console.error('Get user error:', error);
    return { success: false, error: error.message };
  }
};

export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    return { success: true, session };
  } catch (error) {
    console.error('Get session error:', error);
    return { success: false, error: error.message };
  }
};

export const requireSession = async () => {
  const { success, session } = await getSession();
  
  if (!success || !session) {
    // Redirect to login if no session
    window.location.href = '/login.html';
    return null;
  }
  
  return session;
};

export const resetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login.html?mode=reset`
    });
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, error: error.message };
  }
};

export const updatePassword = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Update password error:', error);
    return { success: false, error: error.message };
  }
};

// Auth state change listener
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

// Check if user is authenticated
export const isAuthenticated = async () => {
  const { session } = await getSession();
  return !!session;
};

// Get auth token for API calls
export const getAuthToken = async () => {
  const { session } = await getSession();
  return session?.access_token || null;
};
