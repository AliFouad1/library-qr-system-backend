import express from 'express';
import { validateQR, scanBookQR, scanShelfQR } from '../controllers/qr.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/validate', authenticate, validateQR);
router.post('/scan/book', authenticate, scanBookQR);
router.post('/scan/shelf', authenticate, scanShelfQR);

export default router;
