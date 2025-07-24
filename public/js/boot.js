// Application initialization and boot script
import { initUI } from './ui.js';
import { onAuthStateChange } from './auth.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize UI components
  initUI();
  
  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/js/sw.js');
      console.log('Service Worker registered:', registration);
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
  
  // Handle auth state changes globally
  onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    
    // Handle different auth events
    switch (event) {
      case 'SIGNED_IN':
        // User signed in
        if (window.location.pathname === '/login.html') {
          window.location.href = '/dashboard.html';
        }
        break;
        
      case 'SIGNED_OUT':
        // User signed out
        if (window.location.pathname !== '/login.html' && 
            window.location.pathname !== '/index.html' &&
            window.location.pathname !== '/') {
          window.location.href = '/login.html';
        }
        break;
        
      case 'TOKEN_REFRESHED':
        // Token was refreshed
        console.log('Auth token refreshed');
        break;
    }
  });
  
  // Handle PWA install prompt
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show install button if it exists
    const installButton = document.getElementById('install-app-btn');
    if (installButton) {
      installButton.style.display = 'block';
      
      installButton.addEventListener('click', () => {
        // Hide the install button
        installButton.style.display = 'none';
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          } else {
            console.log('User dismissed the install prompt');
          }
          deferredPrompt = null;
        });
      });
    }
  });
  
  // Handle app installed event
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    const installButton = document.getElementById('install-app-btn');
    if (installButton) {
      installButton.style.display = 'none';
    }
  });
  
  // Handle online/offline status
  const updateOnlineStatus = () => {
    const statusIndicator = document.getElementById('online-status');
    if (statusIndicator) {
      if (navigator.onLine) {
        statusIndicator.textContent = '';
        statusIndicator.classList.add('hidden');
      } else {
        statusIndicator.textContent = 'You're offline - changes saved locally';
        statusIndicator.classList.remove('hidden');
        statusIndicator.className = 'fixed top-0 left-0 right-0 bg-yellow-600 text-white text-center py-2 text-sm z-50';
      }
    }
  };
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Initial status check
  updateOnlineStatus();
  
  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + K for search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const searchButton = document.getElementById('search-btn');
      if (searchButton) {
        searchButton.click();
      }
    }
    
    // Cmd/Ctrl + N for new note
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault();
      const newNoteButton = document.getElementById('new-note-btn');
      if (newNoteButton) {
        newNoteButton.click();
      }
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
      const modals = document.querySelectorAll('.modal-backdrop');
      modals.forEach(modal => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      });
    }
  });
  
  // Handle page-specific initialization
  const path = window.location.pathname;
  
  switch (path) {
    case '/':
    case '/index.html':
      initLandingPage();
      break;
    case '/login.html':
      initLoginPage();
      break;
    case '/dashboard.html':
      initDashboardPage();
      break;
    case '/editor.html':
      initEditorPage();
      break;
    case '/billing.html':
      initBillingPage();
      break;
    case '/settings.html':
      initSettingsPage();
      break;
    case '/invite.html':
      initInvitePage();
      break;
  }
});

// Page-specific initialization functions
function initLandingPage() {
  console.log('Landing page initialized');
  
  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

function initLoginPage() {
  console.log('Login page initialized');
  // Login page specific initialization will be handled in the HTML
}

function initDashboardPage() {
  console.log('Dashboard page initialized');
  // Dashboard specific initialization will be handled in the HTML
}

function initEditorPage() {
  console.log('Editor page initialized');
  // Editor specific initialization will be handled in the HTML
}

function initBillingPage() {
  console.log('Billing page initialized');
  // Billing specific initialization will be handled in the HTML
}

function initSettingsPage() {
  console.log('Settings page initialized');
  // Settings specific initialization will be handled in the HTML
}

function initInvitePage() {
  console.log('Invite page initialized');
  // Invite specific initialization will be handled in the HTML
}

// Export for use in other modules
export {
  initLandingPage,
  initLoginPage,
  initDashboardPage,
  initEditorPage,
  initBillingPage,
  initSettingsPage,
  initInvitePage
};
