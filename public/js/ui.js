// UI utility functions for the note-taking app

let toastContainer = null;

// Initialize toast container
const initToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-4 right-4 z-50 space-y-2';
    document.body.appendChild(toastContainer);
  }
};

// Show toast notification
export const toast = (message, type = 'success', duration = 3000) => {
  initToastContainer();
  
  const toastEl = document.createElement('div');
  const bgColor = type === 'error' ? 'bg-red-600' : 
                  type === 'warning' ? 'bg-yellow-600' : 
                  'bg-brand';
  
  toastEl.className = `px-4 py-2 rounded-lg shadow-lg text-white ${bgColor} transform translate-x-full opacity-0 transition-all duration-300 ease-out max-w-sm`;
  toastEl.textContent = message;
  
  toastContainer.appendChild(toastEl);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toastEl.classList.remove('translate-x-full', 'opacity-0');
    toastEl.classList.add('translate-x-0', 'opacity-100');
  });
  
  // Auto remove
  setTimeout(() => {
    toastEl.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.parentNode.removeChild(toastEl);
      }
    }, 300);
  }, duration);
};

// Show loading skeleton
export const showSkeleton = (container, count = 3) => {
  const skeletonHTML = Array(count).fill(0).map(() => `
    <div class="skeleton h-4 w-full mb-2"></div>
    <div class="skeleton h-4 w-3/4 mb-4"></div>
  `).join('');
  
  container.innerHTML = `<div class="space-y-2">${skeletonHTML}</div>`;
};

// Hide loading skeleton
export const hideSkeleton = (container) => {
  container.innerHTML = '';
};

// Show loading spinner
export const showSpinner = (element, text = 'Loading...') => {
  const spinner = document.createElement('div');
  spinner.className = 'flex items-center justify-center space-x-2';
  spinner.innerHTML = `
    <svg class="animate-spin h-5 w-5 text-brand" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <span class="text-gray-600 dark:text-gray-400">${text}</span>
  `;
  
  element.innerHTML = '';
  element.appendChild(spinner);
};

// Modal utilities
export const createModal = (title, content, actions = []) => {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  
  const actionsHTML = actions.map(action => 
    `<button class="btn ${action.class || 'btn-secondary'}" data-action="${action.action}">${action.text}</button>`
  ).join('');
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">${title}</h3>
          <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" data-action="close">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="mb-6 text-gray-700 dark:text-gray-300">
          ${content}
        </div>
        <div class="flex justify-end space-x-3">
          ${actionsHTML}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Handle clicks
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.dataset.action === 'close') {
      closeModal(modal);
    }
  });
  
  // Handle action buttons
  modal.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (action && action !== 'close') {
      const event = new CustomEvent('modalAction', { detail: { action, modal } });
      document.dispatchEvent(event);
    }
  });
  
  // Handle escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal(modal);
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  return modal;
};

export const closeModal = (modal) => {
  if (modal && modal.parentNode) {
    modal.parentNode.removeChild(modal);
  }
};

// Confirmation dialog
export const confirm = (message, title = 'Confirm') => {
  return new Promise((resolve) => {
    const modal = createModal(title, message, [
      { text: 'Cancel', class: 'btn-secondary', action: 'cancel' },
      { text: 'Confirm', class: 'btn-primary', action: 'confirm' }
    ]);
    
    const handleAction = (e) => {
      const { action } = e.detail;
      closeModal(modal);
      document.removeEventListener('modalAction', handleAction);
      resolve(action === 'confirm');
    };
    
    document.addEventListener('modalAction', handleAction);
  });
};

// Prompt dialog
export const prompt = (message, defaultValue = '', title = 'Input') => {
  return new Promise((resolve) => {
    const inputId = 'prompt-input-' + Date.now();
    const content = `
      <p class="mb-4">${message}</p>
      <input type="text" id="${inputId}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white" value="${defaultValue}" />
    `;
    
    const modal = createModal(title, content, [
      { text: 'Cancel', class: 'btn-secondary', action: 'cancel' },
      { text: 'OK', class: 'btn-primary', action: 'ok' }
    ]);
    
    const input = modal.querySelector(`#${inputId}`);
    input.focus();
    input.select();
    
    const handleAction = (e) => {
      const { action } = e.detail;
      const value = action === 'ok' ? input.value : null;
      closeModal(modal);
      document.removeEventListener('modalAction', handleAction);
      resolve(value);
    };
    
    document.addEventListener('modalAction', handleAction);
    
    // Handle enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const value = input.value;
        closeModal(modal);
        document.removeEventListener('modalAction', handleAction);
        resolve(value);
      }
    });
  });
};

// Format date for display
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
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

// Dark mode utilities
export const toggleDarkMode = () => {
  const html = document.documentElement;
  const isDark = html.classList.contains('dark');
  
  if (isDark) {
    html.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  } else {
    html.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
  
  return !isDark;
};

export const initDarkMode = () => {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
};

// Initialize UI
export const initUI = () => {
  initDarkMode();
  initToastContainer();
};
