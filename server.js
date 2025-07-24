import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import API handlers
import stripeWebhook from './api/stripeWebhook.js';
import createCheckout from './api/createCheckout.js';
import inviteCollaborator from './api/inviteCollaborator.js';
import moveNote from './api/moveNote.js';
import searchNotes from './api/searchNotes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for Stripe webhook (needs raw body)
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// General middleware
app.use(cors());
app.use(express.json());

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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Endpoint not found'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Note Taking App API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
