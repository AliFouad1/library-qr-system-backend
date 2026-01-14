/**
 * QR Code Service
 * Handles QR code generation and validation for books and shelves
 */

import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate QR code for a book
 * QR contains only the book ID (secure approach)
 * @param {string} bookId - Book UUID
 * @returns {Promise<string>} Base64 encoded QR code image
 */
export const generateBookQRCode = async (bookId) => {
  try {
    // Verify book exists
    const book = await prisma.book.findUnique({
      where: { id: bookId }
    });

    if (!book) {
      throw new Error('Book not found');
    }

    // QR contains URL to frontend book detail page
    const baseUrl = process.env.QR_CODE_BASE_URL || 'http://localhost:3000/book';
    const qrData = `${baseUrl}/${bookId}`;

    // Generate QR code as base64 data URL
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Update book with QR code
    await prisma.book.update({
      where: { id: bookId },
      data: { qrCode: qrCodeDataURL }
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating book QR code:', error);
    throw error;
  }
};

/**
 * Generate QR code for a shelf
 * @param {string} shelfId - Shelf UUID
 * @returns {Promise<string>} Base64 encoded QR code image
 */
export const generateShelfQRCode = async (shelfId) => {
  try {
    // Verify shelf exists
    const shelf = await prisma.shelf.findUnique({
      where: { id: shelfId }
    });

    if (!shelf) {
      throw new Error('Shelf not found');
    }

    // QR contains URL to frontend shelf detail page
    const baseUrl = process.env.QR_CODE_BASE_URL || 'http://localhost:3000/book';
    const qrData = `${baseUrl.replace('/book', '/shelf')}/${shelfId}`;

    // Generate QR code
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Update shelf with QR code
    await prisma.shelf.update({
      where: { id: shelfId },
      data: { qrCode: qrCodeDataURL }
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating shelf QR code:', error);
    throw error;
  }
};

/**
 * Validate and decode scanned QR code
 * @param {string} qrData - Scanned QR data (JSON string)
 * @returns {Promise<Object>} Decoded QR data with validation
 */
export const validateQRCode = async (qrData) => {
  try {
    // Parse QR data
    let parsed;
    try {
      parsed = JSON.parse(qrData);
    } catch {
      throw new Error('Invalid QR code format');
    }

    const { type, id } = parsed;

    if (!type || !id) {
      throw new Error('QR code missing required fields');
    }

    // Validate based on type
    if (type === 'BOOK') {
      const book = await prisma.book.findUnique({
        where: { id },
        include: {
          category: true,
          shelf: true
        }
      });

      if (!book) {
        throw new Error('Book not found');
      }

      return {
        valid: true,
        type: 'BOOK',
        data: book
      };
    } else if (type === 'SHELF') {
      const shelf = await prisma.shelf.findUnique({
        where: { id },
        include: {
          books: {
            include: {
              category: true
            }
          }
        }
      });

      if (!shelf) {
        throw new Error('Shelf not found');
      }

      return {
        valid: true,
        type: 'SHELF',
        data: shelf
      };
    } else {
      throw new Error('Unknown QR code type');
    }
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
};

/**
 * Scan book QR and return book details
 * @param {string} bookId - Book UUID from scanned QR
 * @returns {Promise<Object>} Book details with status
 */
export const scanBook = async (bookId) => {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      category: true,
      shelf: true,
      borrowings: {
        where: {
          status: 'BORROWED'
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          borrowDate: 'desc'
        }
      }
    }
  });

  if (!book) {
    throw new Error('Book not found');
  }

  // Get borrowing history
  const borrowingHistory = await prisma.borrowing.findMany({
    where: {
      bookId: book.id
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      }
    },
    orderBy: {
      borrowDate: 'desc'
    },
    take: 10 // Last 10 borrowings
  });

  return {
    ...book,
    borrowingHistory,
    isAvailable: book.copiesAvailable > 0,
    currentBorrower: book.borrowings[0] || null
  };
};

/**
 * Scan shelf QR and return shelf audit information
 * @param {string} shelfId - Shelf UUID from scanned QR
 * @returns {Promise<Object>} Shelf details with books
 */
export const scanShelf = async (shelfId) => {
  const shelf = await prisma.shelf.findUnique({
    where: { id: shelfId },
    include: {
      books: {
        include: {
          category: true,
          borrowings: {
            where: {
              status: 'BORROWED'
            }
          }
        }
      }
    }
  });

  if (!shelf) {
    throw new Error('Shelf not found');
  }

  // Separate books by status
  const expectedBooks = shelf.books;
  const availableBooks = expectedBooks.filter(book => book.copiesAvailable > 0);
  const borrowedBooks = expectedBooks.filter(book => book.borrowings.length > 0);

  return {
    shelf: {
      id: shelf.id,
      shelfCode: shelf.shelfCode,
      location: shelf.location,
      floor: shelf.floor,
      capacity: shelf.capacity,
      description: shelf.description
    },
    expectedBooks: expectedBooks.length,
    availableBooks: availableBooks.length,
    borrowedBooks: borrowedBooks.length,
    books: expectedBooks.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category?.name,
      copiesTotal: book.copiesTotal,
      copiesAvailable: book.copiesAvailable,
      status: book.status,
      isBorrowed: book.borrowings.length > 0
    }))
  };
};

/**
 * Generate printable QR codes (for multiple books or shelves)
 * @param {Array} items - Array of {id, type, title}
 * @returns {Promise<Array>} Array of QR codes with labels
 */
export const generateBulkQRCodes = async (items) => {
  const qrCodes = [];

  for (const item of items) {
    // Generate URL based on type
    const baseUrl = process.env.QR_CODE_BASE_URL || 'http://localhost:3000/book';
    const qrData = item.type === 'BOOK'
      ? `${baseUrl}/${item.id}`
      : `${baseUrl.replace('/book', '/shelf')}/${item.id}`;

    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 200,
      margin: 1
    });

    qrCodes.push({
      id: item.id,
      type: item.type,
      label: item.title || item.code,
      qrCode: qrCodeDataURL
    });
  }

  return qrCodes;
};
