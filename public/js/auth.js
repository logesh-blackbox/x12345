// Authentication utilities
import { supabase, getCurrentSession, getCurrentUser } from './supabaseClient.js';
import { showToast } from './ui.js';

// Sign up new user
export const signUp = async (email, password, fullName) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (error) {
      throw error;
    }

    if (data.user && !data.session) {
      showToast('Please check your email to confirm your account', 'info');
      return { success: true, needsConfirmation: true };
    }

    return { success: true, user: data.user, session: data.session };
  } catch (error) {
    console.error('Sign up error:', error);
    showToast(error.message, 'error');
    return { success: false, error: error.message };
  }
};

// Sign in existing user
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    showToast('Welcome back!', 'success');
    return { success: true, user: data.user, session: data.session };
  } catch (error) {
    console.error('Sign in error:', error);
    showToast(error.message, 'error');
    return { success: false, error: error.message };
  }
};

// Sign out user
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    
    showToast('Signed out successfully', 'success');
    window.location.href = '/';
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    showToast(error.message, 'error');
    return { success: false, error: error.message };
  }
};

// Reset password
export const resetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login.html?reset=true`
    });

    if (error) {
      throw error;
    }

    showToast('Password reset email sent', 'success');
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    showToast(error.message, 'error');
    return { success: false, error: error.message };
  }
};

// Update password (after reset)
export const updatePassword = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw error;
    }

    showToast('Password updated successfully', 'success');
    return { success: true };
  } catch (error) {
    console.error('Password update error:', error);
    showToast(error.message, 'error');
    return { success: false, error: error.message };
  }
};

// Require authentication - redirect to login if not authenticated
export const requireAuth = async () => {
  const session = await getCurrentSession();
  if (!session) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
};

// Redirect if already authenticated
export const redirectIfAuthenticated = async () => {
  const session = await getCurrentSession();
  if (session) {
    window.location.href = '/dashboard.html';
    return true;
  }
  return false;
};

// Listen for auth state changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};

// Get user profile data
export const getUserProfile = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('uid', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      throw error;
    }

    // Return user data with settings
    return {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name || '',
      settings: data || {
        theme: 'system',
        font: 'inter',
        reduced_motion: false
      }
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (updates) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    // Update auth metadata if needed
    if (updates.fullName !== undefined) {
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: updates.fullName }
      });
      if (authError) throw authError;
    }

    // Update user settings
    if (updates.settings) {
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
          uid: user.id,
          ...updates.settings
        });
      if (settingsError) throw settingsError;
    }

    showToast('Profile updated successfully', 'success');
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    showToast(error.message, 'error');
    return { success: false, error: error.message };
  }
};
