import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware.js';
import { generateShelfQRCode } from '../services/qr.service.js';

const prisma = new PrismaClient();

export const getAllShelves = async (req, res, next) => {
  try {
    const shelves = await prisma.shelf.findMany({
      include: {
        _count: { select: { books: true } }
      },
      orderBy: { shelfCode: 'asc' }
    });
    res.json({ success: true, data: shelves });
  } catch (error) {
    next(error);
  }
};

export const getShelfById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const shelf = await prisma.shelf.findUnique({
      where: { id },
      include: {
        books: { include: { category: true } }
      }
    });
    
    if (!shelf) {
      throw new AppError('Shelf not found', 'SHELF_NOT_FOUND', 404);
    }
    
    res.json({ success: true, data: shelf });
  } catch (error) {
    next(error);
  }
};

export const createShelf = async (req, res, next) => {
  try {
    const { shelfCode, location, floor, capacity, description } = req.body;
    
    if (!shelfCode || !location) {
      throw new AppError('Shelf code and location are required', 'VALIDATION_ERROR', 400);
    }

    const shelf = await prisma.shelf.create({
      data: { shelfCode, location, floor, capacity, description }
    });

    // Generate QR code
    await generateShelfQRCode(shelf.id);

    const updatedShelf = await prisma.shelf.findUnique({ where: { id: shelf.id } });

    res.status(201).json({
      success: true,
      data: updatedShelf,
      message: 'Shelf created with QR code'
    });
  } catch (error) {
    next(error);
  }
};

export const updateShelf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const shelf = await prisma.shelf.update({
      where: { id },
      data: updates
    });

    res.json({ success: true, data: shelf, message: 'Shelf updated' });
  } catch (error) {
    next(error);
  }
};

export const deleteShelf = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if shelf has books
    const booksCount = await prisma.book.count({ where: { shelfId: id } });
    if (booksCount > 0) {
      throw new AppError('Cannot delete shelf with books', 'SHELF_HAS_BOOKS', 400);
    }

    await prisma.shelf.delete({ where: { id } });
    res.json({ success: true, message: 'Shelf deleted' });
  } catch (error) {
    next(error);
  }
};
