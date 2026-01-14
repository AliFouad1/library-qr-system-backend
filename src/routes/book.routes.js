import express from 'express';
import {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  regenerateQRCode,
  getBookStats
} from '../controllers/book.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public endpoint for QR code scanning (no authentication required)
router.get('/public/:id', getBookById);

// Protected endpoints
router.get('/', authenticate, getAllBooks);
router.get('/stats', authenticate, getBookStats);
router.get('/:id', authenticate, getBookById);
router.post('/', authenticate, authorize('ADMIN', 'STAFF'), createBook);
router.put('/:id', authenticate, authorize('ADMIN', 'STAFF'), updateBook);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteBook);
router.post('/:id/regenerate-qr', authenticate, authorize('ADMIN', 'STAFF'), regenerateQRCode);

export default router;
