import { getAuthToken } from './auth.js';

const API_BASE = window.location.origin + '/api';

// Generic API call function
async function apiCall(endpoint, method = 'GET', body = null) {
  try {
    const token = await getAuthToken();
    
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (body && method !== 'GET') {
      config.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    
    return { success: true, data: data.data || data };
  } catch (error) {
    console.error(`API call failed: ${method} ${endpoint}`, error);
    return { success: false, error: error.message };
  }
}

// Search notes
export const searchNotes = async (query, limit = 20) => {
  return apiCall('/search', 'POST', { query, limit });
};

// Create Stripe checkout session
export const createCheckoutSession = async (priceId, successUrl, cancelUrl) => {
  return apiCall('/billing/checkout-session', 'POST', {
    priceId,
    successUrl,
    cancelUrl
  });
};

// Invite collaborator to note
export const inviteCollaborator = async (noteId, email, role) => {
  return apiCall(`/notes/${noteId}/share`, 'POST', { email, role });
};

// Move note to folder
export const moveNote = async (noteId, folderId) => {
  return apiCall(`/notes/${noteId}/move`, 'POST', { folderId });
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await fetch('/health');
    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Stripe price IDs (these would typically come from environment or config)
export const STRIPE_PRICES = {
  PRO_MONTHLY: 'price_1234567890', // Replace with actual Stripe price ID
  PRO_YEARLY: 'price_0987654321'   // Replace with actual Stripe price ID
};

export default {
  searchNotes,
  createCheckoutSession,
  inviteCollaborator,
  moveNote,
  healthCheck,
  STRIPE_PRICES
};
