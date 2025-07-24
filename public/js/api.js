// API utilities for backend communication
import { getAuthHeaders } from './supabaseClient.js';
import { showToast } from './ui.js';

const API_BASE = window.location.origin;

// Generic API call wrapper
const apiCall = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      method: 'GET',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
};

// Search notes
export const searchNotes = async (query, limit = 20) => {
  try {
    const headers = await getAuthHeaders();
    return await apiCall('/api/search', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, limit })
    });
  } catch (error) {
    showToast('Search failed: ' + error.message, 'error');
    throw error;
  }
};

// Move note to folder
export const moveNote = async (noteId, folderId) => {
  try {
    const headers = await getAuthHeaders();
    return await apiCall(`/api/notes/${noteId}/move`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ folderId })
    });
  } catch (error) {
    showToast('Failed to move note: ' + error.message, 'error');
    throw error;
  }
};

// Share note with collaborator
export const shareNote = async (noteId, email, role = 'view') => {
  try {
    const headers = await getAuthHeaders();
    return await apiCall(`/api/notes/${noteId}/share`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, role })
    });
  } catch (error) {
    showToast('Failed to share note: ' + error.message, 'error');
    throw error;
  }
};

// Create Stripe checkout session
export const createCheckoutSession = async (priceId, successUrl, cancelUrl) => {
  try {
    const headers = await getAuthHeaders();
    return await apiCall('/api/billing/checkout-session', {
      method: 'POST',
      headers,
      body: JSON.stringify({ priceId, successUrl, cancelUrl })
    });
  } catch (error) {
    showToast('Failed to create checkout session: ' + error.message, 'error');
    throw error;
  }
};

// Health check
export const healthCheck = async () => {
  try {
    return await apiCall('/health');
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

// Direct Supabase operations (using client-side auth)
import { supabase, getCurrentUser } from './supabaseClient.js';

// Get all folders for current user
export const getFolders = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('owner_uid', user.id)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching folders:', error);
    showToast('Failed to load folders', 'error');
    return [];
  }
};

// Create new folder
export const createFolder = async (name, parentFolderId = null) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('folders')
      .insert({
        name,
        owner_uid: user.id,
        parent_folder_id: parentFolderId
      })
      .select()
      .single();

    if (error) throw error;
    showToast('Folder created successfully', 'success');
    return data;
  } catch (error) {
    console.error('Error creating folder:', error);
    showToast('Failed to create folder: ' + error.message, 'error');
    throw error;
  }
};

// Get notes for current user
export const getNotes = async (folderId = null, limit = 50) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('notes')
      .select(`
        *,
        folders(name),
        note_tags(tags(name))
      `)
      .eq('owner_uid', user.id)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (folderId) {
      query = query.eq('folder_id', folderId);
    } else {
      query = query.is('folder_id', null);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching notes:', error);
    showToast('Failed to load notes', 'error');
    return [];
  }
};

// Get single note
export const getNote = async (noteId) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('notes')
      .select(`
        *,
        folders(name),
        note_tags(tags(name)),
        note_permissions(
          collaborator_uid,
          can_edit,
          can_comment
        )
      `)
      .eq('id', noteId)
      .or(`owner_uid.eq.${user.id},note_permissions.collaborator_uid.eq.${user.id}`)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching note:', error);
    showToast('Failed to load note', 'error');
    throw error;
  }
};

// Create new note
export const createNote = async (title = 'Untitled', body = '', folderId = null) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('notes')
      .insert({
        title,
        body,
        owner_uid: user.id,
        folder_id: folderId,
        draft: true,
        encrypted: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating note:', error);
    showToast('Failed to create note: ' + error.message, 'error');
    throw error;
  }
};

// Update note
export const updateNote = async (noteId, updates) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('notes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .eq('owner_uid', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating note:', error);
    throw error;
  }
};

// Delete note
export const deleteNote = async (noteId) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId)
      .eq('owner_uid', user.id);

    if (error) throw error;
    showToast('Note deleted successfully', 'success');
    return true;
  } catch (error) {
    console.error('Error deleting note:', error);
    showToast('Failed to delete note: ' + error.message, 'error');
    throw error;
  }
};

// Get user subscription info
export const getUserSubscription = async () => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('uid', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found error
      throw error;
    }

    return data || {
      plan: 'free',
      status: 'inactive',
      current_period_end: null
    };
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return {
      plan: 'free',
      status: 'inactive',
      current_period_end: null
    };
  }
};
