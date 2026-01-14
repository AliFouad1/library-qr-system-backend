/**
 * Borrowing Controller
 * Handles book borrowing and return operations
 */

import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware.js';

const prisma = new PrismaClient();

/**
 * Borrow a book
 * POST /api/borrowing/borrow
 */
export const borrowBook = async (req, res, next) => {
  try {
    const { bookId, borrowDays, notes } = req.body;
    let { userId } = req.body;

    // If no userId provided, use current user
    // If userId provided, only ADMIN can borrow for others
    if (!userId) {
      userId = req.user.id;
    } else if (userId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError('Only administrators can borrow books for other users', 'FORBIDDEN', 403);
    }

    // Validation
    if (!bookId) {
      throw new AppError('Book ID is required', 'VALIDATION_ERROR', 400);
    }

    // Check if book exists and is available
    const book = await prisma.book.findUnique({
      where: { id: bookId }
    });

    if (!book) {
      throw new AppError('Book not found', 'BOOK_NOT_FOUND', 404);
    }

    if (book.copiesAvailable <= 0) {
      throw new AppError('No copies available for borrowing', 'NO_COPIES_AVAILABLE', 400);
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('User account is not active', 'INACTIVE_USER', 403);
    }

    // Check if user already has this book borrowed
    const existingBorrowing = await prisma.borrowing.findFirst({
      where: {
        userId,
        bookId,
        status: 'BORROWED'
      }
    });

    if (existingBorrowing) {
      throw new AppError('User already has this book borrowed', 'ALREADY_BORROWED', 400);
    }

    // Check borrowing limit (optional: max 5 books per user)
    const activeBorrowings = await prisma.borrowing.count({
      where: {
        userId,
        status: 'BORROWED'
      }
    });

    const MAX_BOOKS_PER_USER = parseInt(process.env.MAX_BOOKS_PER_USER) || 5;
    if (activeBorrowings >= MAX_BOOKS_PER_USER) {
      throw new AppError(
        `User has reached the maximum borrowing limit of ${MAX_BOOKS_PER_USER} books`,
        'BORROWING_LIMIT_REACHED',
        400
      );
    }

    // Calculate expected return date
    const days = borrowDays || parseInt(process.env.MAX_BORROW_DAYS) || 14;
    const expectedReturnDate = new Date();
    expectedReturnDate.setDate(expectedReturnDate.getDate() + days);

    // Create borrowing record
    const borrowing = await prisma.borrowing.create({
      data: {
        userId,
        bookId,
        borrowDate: new Date(),
        expectedReturnDate,
        status: 'BORROWED',
        notes
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        book: {
          include: {
            category: true,
            shelf: true
          }
        }
      }
    });

    // Update book availability
    await prisma.book.update({
      where: { id: bookId },
      data: {
        copiesAvailable: {
          decrement: 1
        }
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        bookId,
        action: 'BOOK_BORROWED',
        newValue: {
          borrower: user.fullName,
          borrowerId: userId,
          borrowDate: borrowing.borrowDate,
          expectedReturn: expectedReturnDate
        },
        ipAddress: req.ip
      }
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId,
        type: 'INFO',
        title: 'Book Borrowed Successfully',
        message: `You have borrowed "${book.title}". Please return it by ${expectedReturnDate.toLocaleDateString()}.`,
        isRead: false
      }
    });

    res.status(201).json({
      success: true,
      data: borrowing,
      message: 'Book borrowed successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Return a book
 * POST /api/borrowing/return/:borrowingId
 */
export const returnBook = async (req, res, next) => {
  try {
    const { borrowingId } = req.params;
    const { notes } = req.body;

    // Get borrowing record
    const borrowing = await prisma.borrowing.findUnique({
      where: { id: borrowingId },
      include: {
        book: true,
        user: true
      }
    });

    if (!borrowing) {
      throw new AppError('Borrowing record not found', 'BORROWING_NOT_FOUND', 404);
    }

    if (borrowing.status === 'RETURNED') {
      throw new AppError('Book already returned', 'ALREADY_RETURNED', 400);
    }

    // Update borrowing record
    const updatedBorrowing = await prisma.borrowing.update({
      where: { id: borrowingId },
      data: {
        status: 'RETURNED',
        actualReturnDate: new Date(),
        notes: notes || borrowing.notes
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        book: {
          include: {
            category: true,
            shelf: true
          }
        }
      }
    });

    // Update book availability
    await prisma.book.update({
      where: { id: borrowing.bookId },
      data: {
        copiesAvailable: {
          increment: 1
        }
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        bookId: borrowing.bookId,
        action: 'BOOK_RETURNED',
        oldValue: {
          status: 'BORROWED',
          borrowDate: borrowing.borrowDate
        },
        newValue: {
          status: 'RETURNED',
          returnDate: updatedBorrowing.actualReturnDate
        },
        ipAddress: req.ip
      }
    });

    // Create notification for user
    const isOverdue = new Date() > new Date(borrowing.expectedReturnDate);
    await prisma.notification.create({
      data: {
        userId: borrowing.userId,
        type: isOverdue ? 'REMINDER' : 'INFO',
        title: 'Book Returned',
        message: `Thank you for returning "${borrowing.book.title}"${isOverdue ? ' (was overdue)' : ''}.`,
        isRead: false
      }
    });

    res.json({
      success: true,
      data: updatedBorrowing,
      message: 'Book returned successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all borrowings with filters
 * GET /api/borrowing
 */
export const getAllBorrowings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      userId,
      bookId
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const where = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (bookId) where.bookId = bookId;

    const [borrowings, total] = await Promise.all([
      prisma.borrowing.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true
            }
          },
          book: {
            include: {
              category: true,
              shelf: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { borrowDate: 'desc' }
      }),
      prisma.borrowing.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        borrowings,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's borrowing history
 * GET /api/borrowing/user/:userId
 */
export const getUserBorrowings = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const where = { userId };
    if (status) where.status = status;

    const borrowings = await prisma.borrowing.findMany({
      where,
      include: {
        book: {
          include: {
            category: true,
            shelf: true
          }
        }
      },
      orderBy: { borrowDate: 'desc' }
    });

    res.json({
      success: true,
      data: borrowings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get overdue borrowings
 * GET /api/borrowing/overdue
 */
export const getOverdueBorrowings = async (req, res, next) => {
  try {
    const borrowings = await prisma.borrowing.findMany({
      where: {
        status: 'BORROWED',
        expectedReturnDate: {
          lt: new Date()
        }
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true
          }
        },
        book: {
          include: {
            category: true,
            shelf: true
          }
        }
      },
      orderBy: { expectedReturnDate: 'asc' }
    });

    // Calculate days overdue
    const overdueWithDays = borrowings.map(b => {
      const daysOverdue = Math.floor(
        (new Date() - new Date(b.expectedReturnDate)) / (1000 * 60 * 60 * 24)
      );
      return {
        ...b,
        daysOverdue
      };
    });

    res.json({
      success: true,
      data: overdueWithDays
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Extend borrowing period
 * PUT /api/borrowing/:borrowingId/extend
 */
export const extendBorrowing = async (req, res, next) => {
  try {
    const { borrowingId } = req.params;
    const { additionalDays } = req.body;

    if (!additionalDays || additionalDays < 1) {
      throw new AppError('Additional days must be at least 1', 'VALIDATION_ERROR', 400);
    }

    const borrowing = await prisma.borrowing.findUnique({
      where: { id: borrowingId },
      include: { book: true, user: true }
    });

    if (!borrowing) {
      throw new AppError('Borrowing record not found', 'BORROWING_NOT_FOUND', 404);
    }

    if (borrowing.status !== 'BORROWED') {
      throw new AppError('Can only extend active borrowings', 'INVALID_STATUS', 400);
    }

    // Calculate new expected return date
    const newExpectedReturn = new Date(borrowing.expectedReturnDate);
    newExpectedReturn.setDate(newExpectedReturn.getDate() + parseInt(additionalDays));

    const updatedBorrowing = await prisma.borrowing.update({
      where: { id: borrowingId },
      data: { expectedReturnDate: newExpectedReturn },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        book: true
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        bookId: borrowing.bookId,
        action: 'BORROWING_EXTENDED',
        oldValue: { expectedReturnDate: borrowing.expectedReturnDate },
        newValue: { expectedReturnDate: newExpectedReturn },
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      data: updatedBorrowing,
      message: 'Borrowing period extended successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get borrowing statistics
 * GET /api/borrowing/stats
 */
export const getBorrowingStats = async (req, res, next) => {
  try {
    const [
      totalBorrowings,
      activeBorrowings,
      returnedBorrowings,
      overdueBorrowings
    ] = await Promise.all([
      prisma.borrowing.count(),
      prisma.borrowing.count({ where: { status: 'BORROWED' } }),
      prisma.borrowing.count({ where: { status: 'RETURNED' } }),
      prisma.borrowing.count({
        where: {
          status: 'BORROWED',
          expectedReturnDate: { lt: new Date() }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalBorrowings,
        activeBorrowings,
        returnedBorrowings,
        overdueBorrowings
      }
    });
  } catch (error) {
    next(error);
  }
};
