import { supabase } from './supabaseClient.js';
import { toast } from './ui.js';
import { debounce } from './ui.js';

// Note operations using Supabase directly
export class NotesManager {
  constructor() {
    this.autosaveDelay = 1500; // 1.5 seconds
    this.offlineQueue = [];
    this.isOnline = navigator.onLine;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncOfflineQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }
  
  // Get all notes for current user
  async getNotes() {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select(`
          id,
          title,
          body,
          draft,
          updated_at,
          folder_id,
          folders(name)
        `)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching notes:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Get single note by ID
  async getNote(id) {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select(`
          id,
          title,
          body,
          draft,
          updated_at,
          folder_id,
          folders(name)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching note:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Create new note
  async createNote(title = 'Untitled', body = '', folderId = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title,
          body,
          folder_id: folderId,
          owner_uid: user.id,
          draft: true
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error creating note:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Update note
  async updateNote(id, updates) {
    try {
      if (!this.isOnline) {
        this.queueOfflineUpdate(id, updates);
        return { success: true, offline: true };
      }
      
      const { data, error } = await supabase
        .from('notes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error updating note:', error);
      
      // Queue for offline sync if network error
      if (error.message.includes('fetch')) {
        this.queueOfflineUpdate(id, updates);
        return { success: true, offline: true };
      }
      
      return { success: false, error: error.message };
    }
  }
  
  // Delete note
  async deleteNote(id) {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting note:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Get folders
  async getFolders() {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching folders:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Create folder
  async createFolder(name, parentId = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('folders')
        .insert({
          name,
          parent_folder_id: parentId,
          owner_uid: user.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('Error creating folder:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Setup autosave for a textarea element
  setupAutosave(noteId, textarea) {
    const debouncedSave = debounce(async (content) => {
      const result = await this.updateNote(noteId, { 
        body: content,
        draft: false 
      });
      
      if (result.success) {
        this.showSaveStatus('saved', result.offline);
      } else {
        this.showSaveStatus('error');
        toast('Failed to save note', 'error');
      }
    }, this.autosaveDelay);
    
    textarea.addEventListener('input', (e) => {
      this.showSaveStatus('saving');
      debouncedSave(e.target.value);
    });
    
    // Save on blur as well
    textarea.addEventListener('blur', (e) => {
      debouncedSave(e.target.value);
    });
  }
  
  // Setup autosave for title input
  setupTitleAutosave(noteId, titleInput) {
    const debouncedSave = debounce(async (title) => {
      const result = await this.updateNote(noteId, { title });
      
      if (!result.success && !result.offline) {
        toast('Failed to save title', 'error');
      }
    }, this.autosaveDelay);
    
    titleInput.addEventListener('input', (e) => {
      debouncedSave(e.target.value || 'Untitled');
    });
  }
  
  // Show save status indicator
  showSaveStatus(status, offline = false) {
    const indicator = document.getElementById('save-indicator');
    if (!indicator) return;
    
    const statusText = {
      saving: 'Saving...',
      saved: offline ? 'Saved offline' : 'Saved',
      error: 'Save failed'
    };
    
    const statusClass = {
      saving: 'text-yellow-600',
      saved: offline ? 'text-blue-600' : 'text-green-600',
      error: 'text-red-600'
    };
    
    indicator.textContent = statusText[status];
    indicator.className = `text-sm ${statusClass[status]}`;
    
    // Hide after 2 seconds if saved
    if (status === 'saved') {
      setTimeout(() => {
        indicator.textContent = '';
      }, 2000);
    }
  }
  
  // Queue update for offline sync
  queueOfflineUpdate(noteId, updates) {
    const existingIndex = this.offlineQueue.findIndex(item => 
      item.type === 'update' && item.noteId === noteId
    );
    
    if (existingIndex >= 0) {
      // Merge with existing update
      this.offlineQueue[existingIndex].updates = {
        ...this.offlineQueue[existingIndex].updates,
        ...updates
      };
    } else {
      this.offlineQueue.push({
        type: 'update',
        noteId,
        updates,
        timestamp: Date.now()
      });
    }
    
    // Store in localStorage as backup
    localStorage.setItem('notes_offline_queue', JSON.stringify(this.offlineQueue));
  }
  
  // Sync offline queue when back online
  async syncOfflineQueue() {
    if (this.offlineQueue.length === 0) return;
    
    toast('Syncing offline changes...', 'success');
    
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    
    for (const item of queue) {
      if (item.type === 'update') {
        const result = await this.updateNote(item.noteId, item.updates);
        if (!result.success) {
          // Re-queue failed items
          this.offlineQueue.push(item);
        }
      }
    }
    
    // Update localStorage
    localStorage.setItem('notes_offline_queue', JSON.stringify(this.offlineQueue));
    
    if (this.offlineQueue.length === 0) {
      toast('All changes synced!', 'success');
    } else {
      toast(`${queue.length - this.offlineQueue.length} changes synced`, 'warning');
    }
  }
  
  // Load offline queue from localStorage
  loadOfflineQueue() {
    try {
      const stored = localStorage.getItem('notes_offline_queue');
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
      this.offlineQueue = [];
    }
  }
  
  // Initialize notes manager
  init() {
    this.loadOfflineQueue();
    
    // Try to sync on load if online
    if (this.isOnline && this.offlineQueue.length > 0) {
      setTimeout(() => this.syncOfflineQueue(), 1000);
    }
  }
}

// Create singleton instance
export const notesManager = new NotesManager();

// Initialize on import
notesManager.init();

export default notesManager;
