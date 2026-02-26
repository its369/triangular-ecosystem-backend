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

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import opportunityRoutes from './routes/opportunity.routes.js';
import applicationRoutes from './routes/application.routes.js';
import quotifyRoutes from './routes/quotify.routes.js';
import messageRoutes from './routes/message.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import reputationRoutes from './routes/reputation.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import adminRoutes from './routes/admin.routes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

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

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

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

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'Server is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// API routes
const API_VERSION = process.env.API_VERSION || 'v1';
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/opportunities`, opportunityRoutes);
app.use(`/api/${API_VERSION}/applications`, applicationRoutes);
app.use(`/api/${API_VERSION}/quotify`, quotifyRoutes);
app.use(`/api/${API_VERSION}/messages`, messageRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${API_VERSION}/reputation`, reputationRoutes);
app.use(`/api/${API_VERSION}/payments`, paymentRoutes);
app.use(`/api/${API_VERSION}/admin`, adminRoutes);

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

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
// ✅ CORRECT
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on port ${PORT}`);
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('✅ SERVER IS LISTENING!');
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   🚀 Triangular Ecosystem Backend Server          ║
  ║   Environment: ${process.env.NODE_ENV?.toUpperCase() || 'DEVELOPMENT'.padEnd(11)}                    ║
  ║   Server: http://localhost:${PORT.toString().padEnd(5)}                 ║
  ║   API Version: ${API_VERSION}                                ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`❌ Error: ${err.message}`);
  httpServer.close(() => process.exit(1));
});

export default app;