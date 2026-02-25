import express from 'express';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// TODO: Implement user routes
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'user routes - Coming soon',
    data: []
  });
});

export default router;
