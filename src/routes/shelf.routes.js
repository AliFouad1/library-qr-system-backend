import express from 'express';
import { getAllShelves, getShelfById, createShelf, updateShelf, deleteShelf } from '../controllers/shelf.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticate, getAllShelves);
router.get('/:id', authenticate, getShelfById);
router.post('/', authenticate, authorize('ADMIN', 'STAFF'), createShelf);
router.put('/:id', authenticate, authorize('ADMIN', 'STAFF'), updateShelf);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteShelf);

export default router;
