// Notes management with autosave functionality
import { createNote, updateNote, deleteNote, getNote } from './api.js';
import { showToast, debounce } from './ui.js';

class NotesManager {
  constructor() {
    this.currentNote = null;
    this.autosaveTimeout = null;
    this.isDirty = false;
    this.isAutoSaving = false;
    
    // Debounced autosave function
    this.debouncedAutosave = debounce(() => {
      this.autosave();
    }, 2000);
  }

  // Load note for editing
  async loadNote(noteId) {
    try {
      if (noteId === 'new') {
        this.currentNote = await createNote();
        // Update URL without page reload
        window.history.replaceState({}, '', `/editor.html?id=${this.currentNote.id}`);
      } else {
        this.currentNote = await getNote(noteId);
      }
      
      this.isDirty = false;
      return this.currentNote;
    } catch (error) {
      console.error('Error loading note:', error);
      throw error;
    }
  }

  // Update note content and trigger autosave
  updateContent(title, body) {
    if (!this.currentNote) return;

    const hasChanges = 
      this.currentNote.title !== title || 
      this.currentNote.body !== body;

    if (hasChanges) {
      this.currentNote.title = title;
      this.currentNote.body = body;
      this.isDirty = true;
      
      // Trigger debounced autosave
      this.debouncedAutosave();
      
      // Update UI to show unsaved changes
      this.updateSaveStatus('unsaved');
    }
  }

  // Perform autosave
  async autosave() {
    if (!this.currentNote || !this.isDirty || this.isAutoSaving) {
      return;
    }

    try {
      this.isAutoSaving = true;
      this.updateSaveStatus('saving');

      const updatedNote = await updateNote(this.currentNote.id, {
        title: this.currentNote.title,
        body: this.currentNote.body,
        draft: false
      });

      this.currentNote = updatedNote;
      this.isDirty = false;
      this.updateSaveStatus('saved');

    } catch (error) {
      console.error('Autosave failed:', error);
      this.updateSaveStatus('error');
      showToast('Failed to save note', 'error');
    } finally {
      this.isAutoSaving = false;
    }
  }

  // Force save (manual save)
  async forceSave() {
    if (!this.currentNote) return;

    try {
      this.updateSaveStatus('saving');

      const updatedNote = await updateNote(this.currentNote.id, {
        title: this.currentNote.title,
        body: this.currentNote.body,
        draft: false
      });

      this.currentNote = updatedNote;
      this.isDirty = false;
      this.updateSaveStatus('saved');
      showToast('Note saved successfully', 'success');

      return updatedNote;
    } catch (error) {
      console.error('Save failed:', error);
      this.updateSaveStatus('error');
      showToast('Failed to save note', 'error');
      throw error;
    }
  }

  // Delete current note
  async deleteCurrentNote() {
    if (!this.currentNote) return;

    try {
      await deleteNote(this.currentNote.id);
      this.currentNote = null;
      this.isDirty = false;
      
      // Redirect to dashboard
      window.location.href = '/dashboard.html';
    } catch (error) {
      console.error('Delete failed:', error);
      throw error;
    }
  }

  // Update save status in UI
  updateSaveStatus(status) {
    const statusElement = document.getElementById('save-status');
    if (!statusElement) return;

    const statusConfig = {
      saved: {
        text: 'Saved',
        icon: 'fas fa-check',
        class: 'text-green-600'
      },
      saving: {
        text: 'Saving...',
        icon: 'fas fa-spinner fa-spin',
        class: 'text-blue-600'
      },
      unsaved: {
        text: 'Unsaved changes',
        icon: 'fas fa-circle',
        class: 'text-yellow-600'
      },
      error: {
        text: 'Save failed',
        icon: 'fas fa-exclamation-triangle',
        class: 'text-red-600'
      }
    };

    const config = statusConfig[status] || statusConfig.saved;
    statusElement.innerHTML = `
      <i class="${config.icon} mr-1"></i>
      <span>${config.text}</span>
    `;
    statusElement.className = `flex items-center text-sm ${config.class}`;
  }

  // Check for unsaved changes before leaving
  hasUnsavedChanges() {
    return this.isDirty;
  }

  // Get current note
  getCurrentNote() {
    return this.currentNote;
  }

  // Set up beforeunload handler
  setupBeforeUnloadHandler() {
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    });
  }

  // Clean up
  destroy() {
    if (this.autosaveTimeout) {
      clearTimeout(this.autosaveTimeout);
    }
  }
}

// Export singleton instance
export const notesManager = new NotesManager();

// Note formatting utilities
export const formatNoteContent = (content) => {
  if (!content) return '';
  
  // Basic markdown-like formatting
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/
/g, '<br>');
};

// Extract note preview
export const extractPreview = (content, maxLength = 150) => {
  if (!content) return 'No content';
  
  // Remove markdown formatting for preview
  const plainText = content
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/
/g, ' ')
    .trim();

  return plainText.length > maxLength 
    ? plainText.substring(0, maxLength) + '...'
    : plainText;
};

// Word count utility
export const getWordCount = (text) => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Character count utility
export const getCharCount = (text) => {
  return text ? text.length : 0;
};

// Reading time estimate
export const getReadingTime = (text) => {
  const wordsPerMinute = 200;
  const wordCount = getWordCount(text);
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return minutes === 1 ? '1 min read' : `${minutes} min read`;
};

// Note search utilities
export const highlightSearchTerms = (text, searchTerm) => {
  if (!searchTerm || !text) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
};

// Note export utilities
export const exportAsMarkdown = (note) => {
  const content = `# ${note.title}

${note.body}`;
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${note.title || 'note'}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportAsText = (note) => {
  const content = `${note.title}

${note.body}`;
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${note.title || 'note'}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Keyboard shortcuts for editor
export const setupEditorShortcuts = (titleInput, bodyTextarea) => {
  // Ctrl+S to save
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      notesManager.forceSave();
    }
  });

  // Ctrl+B for bold
  bodyTextarea.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      insertFormatting(bodyTextarea, '**', '**');
    }
  });

  // Ctrl+I for italic
  bodyTextarea.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      insertFormatting(bodyTextarea, '*', '*');
    }
  });

  // Tab for indentation
  bodyTextarea.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = bodyTextarea.selectionStart;
      const end = bodyTextarea.selectionEnd;
      
      bodyTextarea.value = bodyTextarea.value.substring(0, start) + 
        '  ' + bodyTextarea.value.substring(end);
      
      bodyTextarea.selectionStart = bodyTextarea.selectionEnd = start + 2;
    }
  });
};

// Insert formatting around selected text
const insertFormatting = (textarea, before, after) => {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  
  const newText = before + selectedText + after;
  textarea.value = textarea.value.substring(0, start) + 
    newText + textarea.value.substring(end);
  
  // Set cursor position
  if (selectedText) {
    textarea.selectionStart = start;
    textarea.selectionEnd = start + newText.length;
  } else {
    textarea.selectionStart = textarea.selectionEnd = start + before.length;
  }
  
  textarea.focus();
};
