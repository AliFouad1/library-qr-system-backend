/**
 * مسارات الرفوف (Shelf Routes)
 * هذا الملف يحتوي على المسارات المتعلقة برفوف المكتبة
 * كل رف له موقع محدد (طابق، قسم) ورمز QR خاص به
 */

import express from 'express';

// استيراد دالة جلب الرفوف
import { getAllShelves } from '../controllers/shelf.controller.js';

// استيراد وسيط المصادقة
import { authenticate } from '../middleware/auth.middleware.js';

// إنشاء موجه Express
const router = express.Router();

/**
 * الحصول على جميع الرفوف
 * GET /api/shelves
 *
 * يتطلب: تسجيل دخول
 *
 * يُرجع قائمة بجميع رفوف المكتبة مع:
 * - id: معرف الرف
 * - shelfCode: رمز الرف (مثل: A1, B2, C3)
 * - location: الموقع (مثل: الجناح الشرقي)
 * - floor: رقم الطابق
 * - capacity: السعة الاستيعابية
 * - description: وصف الرف
 * - qrCode: رمز QR للرف
 * - _count.books: عدد الكتب على هذا الرف
 */
router.get('/', authenticate, getAllShelves);

// تصدير الموجه
export default router;
