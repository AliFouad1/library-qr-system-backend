/**
 * QR Code Controller
 * Handles QR code scanning and validation
 */

import { validateQRCode, scanBook, scanShelf } from '../services/qr.service.js';
import { AppError } from '../middleware/error.middleware.js';

/**
 * Validate scanned QR code
 * POST /api/qr/validate
 */
export const validateQR = async (req, res, next) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      throw new AppError('QR data is required', 'VALIDATION_ERROR', 400);
    }

    const result = await validateQRCode(qrData);

    res.json({
      success: result.valid,
      data: result.valid ? result.data : null,
      error: result.valid ? null : result.error
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Scan book QR code
 * POST /api/qr/scan/book
 */
export const scanBookQR = async (req, res, next) => {
  try {
    const { bookId, qrData } = req.body;

    let id = bookId;

    // If qrData provided, extract bookId from it
    if (qrData) {
      try {
        const parsed = JSON.parse(qrData);
        if (parsed.type === 'BOOK' && parsed.id) {
          id = parsed.id;
        }
      } catch {
        throw new AppError('Invalid QR data format', 'INVALID_QR', 400);
      }
    }

    if (!id) {
      throw new AppError('Book ID or QR data is required', 'VALIDATION_ERROR', 400);
    }

    const bookDetails = await scanBook(id);

    res.json({
      success: true,
      data: bookDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Scan shelf QR code
 * POST /api/qr/scan/shelf
 */
export const scanShelfQR = async (req, res, next) => {
  try {
    const { shelfId, qrData } = req.body;

    let id = shelfId;

    // If qrData provided, extract shelfId from it
    if (qrData) {
      try {
        const parsed = JSON.parse(qrData);
        if (parsed.type === 'SHELF' && parsed.id) {
          id = parsed.id;
        }
      } catch {
        throw new AppError('Invalid QR data format', 'INVALID_QR', 400);
      }
    }

    if (!id) {
      throw new AppError('Shelf ID or QR data is required', 'VALIDATION_ERROR', 400);
    }

    const shelfDetails = await scanShelf(id);

    res.json({
      success: true,
      data: shelfDetails
    });
  } catch (error) {
    next(error);
  }
};
