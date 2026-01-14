import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Most borrowed books
router.get('/most-borrowed', authenticate, async (req, res, next) => {
  try {
    const result = await prisma.$queryRaw`
      SELECT b.id, b.title, b.author, COUNT(bo.id)::int as borrow_count
      FROM books b
      INNER JOIN borrowing bo ON b.id = bo.book_id
      GROUP BY b.id, b.title, b.author
      ORDER BY borrow_count DESC
      LIMIT 10
    `;
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// Dashboard stats
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const [totalBooks, totalUsers, activeBorrowings, overdueBooks] = await Promise.all([
      prisma.book.count(),
      prisma.user.count(),
      prisma.borrowing.count({ where: { status: 'BORROWED' } }),
      prisma.borrowing.count({
        where: {
          status: 'BORROWED',
          expectedReturnDate: { lt: new Date() }
        }
      })
    ]);

    res.json({
      success: true,
      data: { totalBooks, totalUsers, activeBorrowings, overdueBooks }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
