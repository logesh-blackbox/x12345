// Application bootstrap and initialization
import { initTheme } from './ui.js';
import { onAuthStateChange } from './auth.js';

// Initialize the application
export const initApp = () => {
  // Initialize theme
  initTheme();
  
  // Set up auth state listener
  setupAuthStateListener();
  
  // Set up global error handler
  setupErrorHandler();
  
  // Set up offline detection
  setupOfflineDetection();
  
  // Initialize service worker for PWA
  initServiceWorker();
  
  console.log('Note Taking App initialized');
};

// Set up authentication state listener
const setupAuthStateListener = () => {
  onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    
    // Handle auth events
    switch (event) {
      case 'SIGNED_IN':
        handleSignIn(session);
        break;
      case 'SIGNED_OUT':
        handleSignOut();
        break;
      case 'TOKEN_REFRESHED':
        console.log('Token refreshed');
        break;
    }
  });
};

// Handle successful sign in
const handleSignIn = (session) => {
  const currentPath = window.location.pathname;
  
  // Redirect to dashboard if on login/landing page
  if (currentPath === '/' || currentPath === '/login.html') {
    window.location.href = '/dashboard.html';
  }
};

// Handle sign out
const handleSignOut = () => {
  const currentPath = window.location.pathname;
  
  // Redirect to landing page if on protected pages
  const protectedPages = ['/dashboard.html', '/editor.html', '/settings.html', '/billing.html'];
  if (protectedPages.includes(currentPath)) {
    window.location.href = '/';
  }
};

// Set up global error handler
const setupErrorHandler = () => {
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Don't show toast for script loading errors
    if (event.error && event.error.message && 
        !event.error.message.includes('Loading module')) {
      import('./ui.js').then(({ showToast }) => {
        showToast('An unexpected error occurred', 'error');
      });
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    import('./ui.js').then(({ showToast }) => {
      showToast('An unexpected error occurred', 'error');
    });
  });
};

// Set up offline detection
const setupOfflineDetection = () => {
  const updateOnlineStatus = () => {
    const isOnline = navigator.onLine;
    document.body.classList.toggle('offline', !isOnline);
    
    import('./ui.js').then(({ showToast }) => {
      if (isOnline) {
        showToast('Back online', 'success', 3000);
      } else {
        showToast('You are offline', 'warning', 5000);
      }
    });
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
};

// Initialize service worker
const initServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/js/sw.js');
      console.log('Service Worker registered:', registration);
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            import('./ui.js').then(({ showToast }) => {
              showToast('New version available. Refresh to update.', 'info', 10000);
            });
          }
        });
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// Page-specific initialization
export const initPage = (pageName) => {
  console.log(`Initializing page: ${pageName}`);
  
  switch (pageName) {
    case 'landing':
      initLandingPage();
      break;
    case 'login':
      initLoginPage();
      break;
    case 'dashboard':
      initDashboardPage();
      break;
    case 'editor':
      initEditorPage();
      break;
    case 'settings':
      initSettingsPage();
      break;
    case 'billing':
      initBillingPage();
      break;
    case 'invite':
      initInvitePage();
      break;
  }
};

// Landing page initialization
const initLandingPage = async () => {
  const { redirectIfAuthenticated } = await import('./auth.js');
  await redirectIfAuthenticated();
  
  // Set up CTA buttons
  const ctaButtons = document.querySelectorAll('[data-cta]');
  ctaButtons.forEach(button => {
    button.addEventListener('click', () => {
      window.location.href = '/login.html';
    });
  });
};

// Login page initialization
const initLoginPage = async () => {
  const { redirectIfAuthenticated } = await import('./auth.js');
  await redirectIfAuthenticated();
  
  // Dynamic import to avoid loading auth module on every page
  const authModule = await import('./auth.js');
  const uiModule = await import('./ui.js');
  
  setupLoginForm(authModule, uiModule);
};

// Dashboard page initialization
const initDashboardPage = async () => {
  const { requireAuth } = await import('./auth.js');
  const isAuthenticated = await requireAuth();
  
  if (isAuthenticated) {
    const dashboardModule = await import('./dashboard.js');
    dashboardModule.initDashboard();
  }
};

// Editor page initialization
const initEditorPage = async () => {
  const { requireAuth } = await import('./auth.js');
  const isAuthenticated = await requireAuth();
  
  if (isAuthenticated) {
    const editorModule = await import('./editor.js');
    editorModule.initEditor();
  }
};

// Settings page initialization
const initSettingsPage = async () => {
  const { requireAuth } = await import('./auth.js');
  const isAuthenticated = await requireAuth();
  
  if (isAuthenticated) {
    const settingsModule = await import('./settings.js');
    settingsModule.initSettings();
  }
};

// Billing page initialization
const initBillingPage = async () => {
  const { requireAuth } = await import('./auth.js');
  const isAuthenticated = await requireAuth();
  
  if (isAuthenticated) {
    const billingModule = await import('./billing.js');
    billingModule.initBilling();
  }
};

// Invite page initialization
const initInvitePage = async () => {
  const inviteModule = await import('./invite.js');
  inviteModule.initInvite();
};

// Set up login form
const setupLoginForm = (authModule, uiModule) => {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const toggleButtons = document.querySelectorAll('[data-toggle]');
  
  // Form toggle functionality
  toggleButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const target = button.dataset.toggle;
      
      if (target === 'signup') {
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
      } else {
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
      }
    });
  });
  
  // Login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(loginForm);
      const email = formData.get('email');
      const password = formData.get('password');
      
      const submitButton = loginForm.querySelector('button[type="submit"]');
      const originalText = submitButton.textContent;
      
      try {
        submitButton.textContent = 'Signing in...';
        submitButton.disabled = true;
        
        const result = await authModule.signIn(email, password);
        
        if (result.success) {
          window.location.href = '/dashboard.html';
        }
      } catch (error) {
        console.error('Login error:', error);
      } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      }
    });
  }
  
  // Signup form submission
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(signupForm);
      const email = formData.get('email');
      const password = formData.get('password');
      const fullName = formData.get('fullName');
      
      const submitButton = signupForm.querySelector('button[type="submit"]');
      const originalText = submitButton.textContent;
      
      try {
        submitButton.textContent = 'Creating account...';
        submitButton.disabled = true;
        
        const result = await authModule.signUp(email, password, fullName);
        
        if (result.success && !result.needsConfirmation) {
          window.location.href = '/dashboard.html';
        }
      } catch (error) {
        console.error('Signup error:', error);
      } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      }
    });
  }
};

// Utility function to get URL parameters
export const getUrlParams = () => {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
};

// Utility function to update URL without reload
export const updateUrl = (path, params = {}) => {
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  
  window.history.pushState({}, '', url.toString());
};
