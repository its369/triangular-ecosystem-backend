console.log('🚀 SERVER.JS STARTING...');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'MISSING');

import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.IO setup for real-time features
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible to routes
app.set('io', io);

// Database connection with better error handling
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set!');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('⚠️  Server will continue but database features will not work!');
    // Don't exit in production - let Railway show the error
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// Connect to database
connectDB();

// Security middleware
app.use(helmet());
app.use(mongoSanitize());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL_PRODUCTION 
    : process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check route (BEFORE all other routes)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Triangular Ecosystem Backend API',
    version: process.env.API_VERSION || 'v1',
    status: 'running',
    endpoints: {
      health: '/health',
      api: `/api/${process.env.API_VERSION || 'v1'}/*`
    }
  });
});

// Dynamic route loading with error handling
const API_VERSION = process.env.API_VERSION || 'v1';
const loadedRoutes = [];
const failedRoutes = [];

const loadRoute = async (path, routePath) => {
  try {
    const route = await import(routePath);
    app.use(`/api/${API_VERSION}${path}`, route.default);
    loadedRoutes.push(path);
    console.log(`✅ Loaded route: /api/${API_VERSION}${path}`);
  } catch (error) {
    failedRoutes.push({ path, error: error.message });
    console.warn(`⚠️  Failed to load route ${path}: ${error.message}`);
  }
};

// Load all routes (async)
(async () => {
  await loadRoute('/auth', './routes/auth.routes.js');
  await loadRoute('/users', './routes/user.routes.js');
  await loadRoute('/opportunities', './routes/opportunity.routes.js');
  await loadRoute('/applications', './routes/application.routes.js');
  await loadRoute('/quotify', './routes/quotify.routes.js');
  await loadRoute('/messages', './routes/message.routes.js');
  await loadRoute('/notifications', './routes/notification.routes.js');
  await loadRoute('/reputation', './routes/reputation.routes.js');
  await loadRoute('/payments', './routes/payment.routes.js');
  await loadRoute('/admin', './routes/admin.routes.js');

  console.log(`\n📊 Route Loading Summary:`);
  console.log(`✅ Loaded: ${loadedRoutes.length} routes`);
  console.log(`⚠️  Failed: ${failedRoutes.length} routes`);
  
  if (failedRoutes.length > 0) {
    console.log('\n⚠️  Missing routes (create these files later):');
    failedRoutes.forEach(r => console.log(`   - ${r.path}`));
  }
})();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // Join user's personal room
  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });

  // Handle real-time messaging
  socket.on('send_message', (data) => {
    io.to(`user:${data.recipientId}`).emit('receive_message', data);
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    socket.to(`user:${data.recipientId}`).emit('user_typing', data);
  });

  // Handle notifications
  socket.on('send_notification', (data) => {
    io.to(`user:${data.userId}`).emit('new_notification', data);
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: loadedRoutes.map(r => `/api/${API_VERSION}${r}`)
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
console.log('🔥 ABOUT TO START LISTENING ON PORT:', PORT);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ SERVER IS LISTENING!');
  console.log('═══════════════════════════════════════════════════');
  console.log(`🚀 Triangular Ecosystem Backend Server`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Local URL: http://localhost:${PORT}`);
  console.log(`💾 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}`);
  console.log(`📡 API Version: ${API_VERSION}`);
  
  if (process.env.RAILWAY_ENVIRONMENT) {
    console.log(`🚂 Railway: DEPLOYED`);
    console.log(`🌍 Public URL: https://triangular-ecosystem-backend-production.up.railway.app`);
  }
  
  console.log('═══════════════════════════════════════════════════');
  console.log('');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection: ${err.message}`);
  console.error(err.stack);
  
  // Close server gracefully
  httpServer.close(() => {
    console.log('⚠️  Server closed due to unhandled rejection');
    process.exit(1);
  });
});

// Handle SIGTERM (Railway shutdown signal)
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  
  httpServer.close(() => {
    console.log('✅ Server closed');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});

export default app;
