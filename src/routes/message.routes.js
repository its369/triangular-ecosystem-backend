import express from 'express';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// TODO: Implement message routes
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'message routes - Coming soon',
    data: []
  });
});

export default router;
