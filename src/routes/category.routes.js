import express from 'express';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticate, getAllCategories);
router.post('/', authenticate, authorize('ADMIN', 'STAFF'), createCategory);
router.put('/:id', authenticate, authorize('ADMIN', 'STAFF'), updateCategory);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteCategory);

export default router;
