/**
 * Book Controller
 * Handles all book management operations
 */

import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware.js';
import { generateBookQRCode } from '../services/qr.service.js';

const prisma = new PrismaClient();

/**
 * Get all books with filters and pagination
 * GET /api/books
 */
export const getAllBooks = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      shelfId,
      status
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter conditions
    const where = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { isbn: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (shelfId) {
      where.shelfId = shelfId;
    }

    if (status) {
      where.status = status;
    }

    // Get books with pagination
    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        include: {
          category: true,
          shelf: true,
          borrowings: {
            where: { status: 'BORROWED' },
            take: 1,
            orderBy: { borrowDate: 'desc' }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.book.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        books,
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
 * Get single book by ID
 * GET /api/books/:id
 */
export const getBookById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        category: true,
        shelf: true,
        borrowings: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          },
          orderBy: { borrowDate: 'desc' },
          take: 10
        }
      }
    });

    if (!book) {
      throw new AppError('Book not found', 'BOOK_NOT_FOUND', 404);
    }

    res.json({
      success: true,
      data: book
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new book
 * POST /api/books
 */
export const createBook = async (req, res, next) => {
  try {
    const {
      title,
      author,
      isbn,
      categoryId,
      shelfId,
      copiesTotal,
      description,
      publicationYear
    } = req.body;

    // Validation
    if (!title || !author) {
      throw new AppError('Title and author are required', 'VALIDATION_ERROR', 400);
    }

    // Check if ISBN already exists
    if (isbn) {
      const existingBook = await prisma.book.findUnique({
        where: { isbn }
      });

      if (existingBook) {
        throw new AppError('A book with this ISBN already exists', 'ISBN_EXISTS', 409);
      }
    }

    // Create book
    const book = await prisma.book.create({
      data: {
        title,
        author,
        isbn,
        categoryId,
        shelfId,
        copiesTotal: copiesTotal || 1,
        copiesAvailable: copiesTotal || 1,
        description,
        publicationYear,
        status: 'AVAILABLE'
      },
      include: {
        category: true,
        shelf: true
      }
    });

    // Generate QR code
    const qrCode = await generateBookQRCode(book.id);

    // Update book with QR code
    const updatedBook = await prisma.book.update({
      where: { id: book.id },
      data: { qrCode },
      include: {
        category: true,
        shelf: true
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        bookId: book.id,
        action: 'BOOK_CREATED',
        newValue: {
          title: book.title,
          author: book.author,
          isbn: book.isbn
        },
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      success: true,
      data: updatedBook,
      message: 'Book created successfully with QR code'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update book
 * PUT /api/books/:id
 */
export const updateBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      author,
      isbn,
      categoryId,
      shelfId,
      copiesTotal,
      copiesAvailable,
      description,
      publicationYear,
      status
    } = req.body;

    // Get existing book
    const existingBook = await prisma.book.findUnique({
      where: { id }
    });

    if (!existingBook) {
      throw new AppError('Book not found', 'BOOK_NOT_FOUND', 404);
    }

    // Check ISBN uniqueness
    if (isbn && isbn !== existingBook.isbn) {
      const duplicateIsbn = await prisma.book.findUnique({
        where: { isbn }
      });

      if (duplicateIsbn) {
        throw new AppError('A book with this ISBN already exists', 'ISBN_EXISTS', 409);
      }
    }

    // Validate copies
    if (copiesAvailable !== undefined && copiesTotal !== undefined) {
      if (copiesAvailable > copiesTotal) {
        throw new AppError(
          'Available copies cannot exceed total copies',
          'VALIDATION_ERROR',
          400
        );
      }
    }

    // Update book
    const book = await prisma.book.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(author && { author }),
        ...(isbn !== undefined && { isbn }),
        ...(categoryId !== undefined && { categoryId }),
        ...(shelfId !== undefined && { shelfId }),
        ...(copiesTotal !== undefined && { copiesTotal }),
        ...(copiesAvailable !== undefined && { copiesAvailable }),
        ...(description !== undefined && { description }),
        ...(publicationYear !== undefined && { publicationYear }),
        ...(status && { status })
      },
      include: {
        category: true,
        shelf: true
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        bookId: book.id,
        action: 'BOOK_UPDATED',
        oldValue: existingBook,
        newValue: book,
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      data: book,
      message: 'Book updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete book
 * DELETE /api/books/:id
 */
export const deleteBook = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if book has active borrowings
    const activeBorrowings = await prisma.borrowing.count({
      where: {
        bookId: id,
        status: 'BORROWED'
      }
    });

    if (activeBorrowings > 0) {
      throw new AppError(
        'Cannot delete book with active borrowings',
        'ACTIVE_BORROWINGS',
        400
      );
    }

    // Get book for audit log
    const book = await prisma.book.findUnique({
      where: { id }
    });

    if (!book) {
      throw new AppError('Book not found', 'BOOK_NOT_FOUND', 404);
    }

    // Delete book
    await prisma.book.delete({
      where: { id }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'BOOK_DELETED',
        oldValue: {
          id: book.id,
          title: book.title,
          author: book.author
        },
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerate QR code for a book
 * POST /api/books/:id/regenerate-qr
 */
export const regenerateQRCode = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id }
    });

    if (!book) {
      throw new AppError('Book not found', 'BOOK_NOT_FOUND', 404);
    }

    // Generate new QR code
    const qrCode = await generateBookQRCode(id);

    res.json({
      success: true,
      data: { qrCode },
      message: 'QR code regenerated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get book statistics
 * GET /api/books/stats
 */
export const getBookStats = async (req, res, next) => {
  try {
    const [
      totalBooks,
      availableBooks,
      borrowedBooks,
      maintenanceBooks,
      lostBooks,
      totalCopies,
      availableCopies
    ] = await Promise.all([
      prisma.book.count(),
      prisma.book.count({ where: { status: 'AVAILABLE' } }),
      prisma.book.count({ where: { status: 'BORROWED' } }),
      prisma.book.count({ where: { status: 'MAINTENANCE' } }),
      prisma.book.count({ where: { status: 'LOST' } }),
      prisma.book.aggregate({ _sum: { copiesTotal: true } }),
      prisma.book.aggregate({ _sum: { copiesAvailable: true } })
    ]);

    res.json({
      success: true,
      data: {
        totalBooks,
        availableBooks,
        borrowedBooks,
        maintenanceBooks,
        lostBooks,
        totalCopies: totalCopies._sum.copiesTotal || 0,
        availableCopies: availableCopies._sum.copiesAvailable || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sync all book statuses based on copiesAvailable
 * POST /api/books/sync-status
 */
export const syncBookStatus = async (req, res, next) => {
  try {
    // Get all books
    const books = await prisma.book.findMany({
      where: {
        status: {
          notIn: ['MAINTENANCE', 'LOST'] // Don't change manual statuses
        }
      }
    });

    let updated = 0;

    // Update each book's status based on copiesAvailable
    for (const book of books) {
      const correctStatus = book.copiesAvailable > 0 ? 'AVAILABLE' : 'BORROWED';

      if (book.status !== correctStatus) {
        await prisma.book.update({
          where: { id: book.id },
          data: { status: correctStatus }
        });
        updated++;
      }
    }

    res.json({
      success: true,
      message: `Synced ${updated} book(s) status`,
      data: {
        totalBooks: books.length,
        updated
      }
    });
  } catch (error) {
    next(error);
  }
};
