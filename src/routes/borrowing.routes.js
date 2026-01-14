import express from 'express';
import {
  borrowBook,
  returnBook,
  getAllBorrowings,
  getUserBorrowings,
  getOverdueBorrowings,
  extendBorrowing,
  getBorrowingStats
} from '../controllers/borrowing.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/borrow', authenticate, authorize('ADMIN', 'STAFF'), borrowBook);
router.post('/return/:borrowingId', authenticate, authorize('ADMIN', 'STAFF'), returnBook);
router.get('/', authenticate, getAllBorrowings);
router.get('/overdue', authenticate, authorize('ADMIN', 'STAFF'), getOverdueBorrowings);
router.get('/stats', authenticate, getBorrowingStats);
router.get('/user/:userId', authenticate, getUserBorrowings);
router.put('/:borrowingId/extend', authenticate, authorize('ADMIN', 'STAFF'), extendBorrowing);

export default router;
