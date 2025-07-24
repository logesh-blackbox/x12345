import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import API handlers
import stripeWebhook from './api/stripeWebhook.js';
import createCheckout from './api/createCheckout.js';
import inviteCollaborator from './api/inviteCollaborator.js';
import moveNote from './api/moveNote.js';
import searchNotes from './api/searchNotes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for Stripe webhook (needs raw body)
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// General middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Note Taking App API is running' });
});

// API Routes
app.post('/api/stripe/webhook', stripeWebhook);
app.post('/api/billing/checkout-session', createCheckout);
app.post('/api/notes/:noteId/share', (req, res) => {
  req.params = { noteId: req.params.noteId };
  inviteCollaborator(req, res);
});
app.post('/api/notes/:noteId/move', (req, res) => {
  req.params = { noteId: req.params.noteId };
  moveNote(req, res);
});
app.post('/api/search', searchNotes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    ok: false,
    error: 'Internal server error'
  });
});

// Catch-all handler for SPA routes (serve index.html for non-API routes)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      ok: false,
      error: 'API endpoint not found'
    });
  } else {
    // For all other routes, serve the appropriate HTML file or index.html
    const htmlFiles = [
      '/index.html',
      '/login.html', 
      '/dashboard.html',
      '/editor.html',
      '/billing.html',
      '/settings.html',
      '/invite.html'
    ];
    
    const requestedFile = htmlFiles.find(file => req.path === file.replace('.html', '') || req.path === file);
    
    if (requestedFile) {
      res.sendFile(path.join(__dirname, 'public', requestedFile));
    } else {
      // Default to index.html for unknown routes
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Note Taking App API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
