console.log('🚀 MINIMAL SERVER STARTING...');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

import express from 'express';
import cors from 'cors';

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  console.log('📥 Root endpoint hit');
  res.json({
    message: 'Triangular Ecosystem Backend API - MINIMAL VERSION',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('📥 Health endpoint hit');
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ MINIMAL SERVER IS RUNNING!');
  console.log('═══════════════════════════════════════════════════');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET / - Root endpoint');
  console.log('  GET /health - Health check');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
});

// Prevent crashes
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  // DON'T exit - just log it
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  // DON'T exit - just log it
});

export default app;
