// UI utilities and components
let toastContainer = null;

// Initialize toast container
const initToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-4 right-4 z-50 space-y-2';
    document.body.appendChild(toastContainer);
  }
};

// Show toast notification
export const showToast = (message, type = 'info', duration = 5000) => {
  initToastContainer();

  const toast = document.createElement('div');
  const typeClasses = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-500 text-white'
  };

  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  };

  toast.className = `toast-enter flex items-center p-4 rounded-lg shadow-lg max-w-sm ${typeClasses[type] || typeClasses.info}`;
  toast.innerHTML = `
    <i class="${icons[type] || icons.info} mr-3"></i>
    <span class="flex-1">${message}</span>
    <button class="ml-3 text-white hover:text-gray-200" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;

  toastContainer.appendChild(toast);

  // Auto remove after duration
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.remove('toast-enter');
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
};

// Show loading skeleton
export const showSkeleton = (container, count = 3) => {
  const skeletons = Array.from({ length: count }, () => `
    <div class="skeleton h-4 w-full mb-2"></div>
    <div class="skeleton h-4 w-3/4 mb-4"></div>
  `).join('');

  container.innerHTML = `<div class="space-y-2">${skeletons}</div>`;
};

// Show loading spinner
export const showSpinner = (container, message = 'Loading...') => {
  container.innerHTML = `
    <div class="flex items-center justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
      <span class="text-gray-600 dark:text-gray-400">${message}</span>
    </div>
  `;
};

// Create modal
export const createModal = (title, content, options = {}) => {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4';
  
  modalContent.innerHTML = `
    <div class="p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${title}</h3>
        <button class="modal-close text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      ${options.showFooter !== false ? `
        <div class="flex justify-end space-x-3 mt-6">
          ${options.cancelText ? `<button class="btn btn-secondary modal-cancel">${options.cancelText}</button>` : ''}
          ${options.confirmText ? `<button class="btn btn-primary modal-confirm">${options.confirmText}</button>` : ''}
        </div>
      ` : ''}
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Event handlers
  const closeModal = () => modal.remove();
  
  modal.querySelector('.modal-close').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (options.cancelText) {
    modal.querySelector('.modal-cancel').addEventListener('click', () => {
      if (options.onCancel) options.onCancel();
      closeModal();
    });
  }

  if (options.confirmText) {
    modal.querySelector('.modal-confirm').addEventListener('click', () => {
      if (options.onConfirm) options.onConfirm();
      closeModal();
    });
  }

  // ESC key handler
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  return modal;
};

// Confirm dialog
export const confirmDialog = (message, title = 'Confirm') => {
  return new Promise((resolve) => {
    createModal(title, `<p class="text-gray-700 dark:text-gray-300">${message}</p>`, {
      cancelText: 'Cancel',
      confirmText: 'Confirm',
      onCancel: () => resolve(false),
      onConfirm: () => resolve(true)
    });
  });
};

// Prompt dialog
export const promptDialog = (message, defaultValue = '', title = 'Input') => {
  return new Promise((resolve) => {
    const inputId = 'prompt-input-' + Date.now();
    const content = `
      <p class="text-gray-700 dark:text-gray-300 mb-4">${message}</p>
      <input 
        type="text" 
        id="${inputId}"
        value="${defaultValue}"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        placeholder="Enter value..."
      >
    `;

    const modal = createModal(title, content, {
      cancelText: 'Cancel',
      confirmText: 'OK',
      onCancel: () => resolve(null),
      onConfirm: () => {
        const input = document.getElementById(inputId);
        resolve(input.value);
      }
    });

    // Focus input and select text
    setTimeout(() => {
      const input = document.getElementById(inputId);
      input.focus();
      input.select();
    }, 100);
  });
};

// Format date for display
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    showToast('Failed to copy to clipboard', 'error');
    return false;
  }
};

// Theme management
export const setTheme = (theme) => {
  const root = document.documentElement;
  
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else { // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
  
  localStorage.setItem('theme', theme);
};

// Initialize theme
export const initTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'system';
  setTheme(savedTheme);
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'system') {
      setTheme('system');
    }
  });
};

// Keyboard shortcut handler
export const addKeyboardShortcut = (key, callback, ctrlKey = true) => {
  document.addEventListener('keydown', (e) => {
    if (e.key === key && e.ctrlKey === ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      callback(e);
    }
  });
};

// Focus trap for modals
export const trapFocus = (element) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  element.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }
  });

  firstElement.focus();
};
