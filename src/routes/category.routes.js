/**
 * مسارات التصنيفات (Category Routes)
 * هذا الملف يحتوي على المسارات المتعلقة بتصنيفات الكتب
 * مثل: خيال علمي، تاريخ، علوم، أدب، إلخ
 */

import express from 'express';

// استيراد دالة جلب التصنيفات
import { getAllCategories } from '../controllers/category.controller.js';

// استيراد وسيط المصادقة
import { authenticate } from '../middleware/auth.middleware.js';

// إنشاء موجه Express
const router = express.Router();

/**
 * الحصول على جميع التصنيفات
 * GET /api/categories
 *
 * يتطلب: تسجيل دخول
 *
 * يُرجع قائمة بجميع تصنيفات الكتب مع:
 * - id: معرف التصنيف
 * - name: اسم التصنيف
 * - description: وصف التصنيف
 * - _count.books: عدد الكتب في هذا التصنيف
 */
router.get('/', authenticate, getAllCategories);

// تصدير الموجه
export default router;
