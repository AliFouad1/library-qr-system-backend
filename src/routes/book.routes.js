/**
 * مسارات الكتب (Book Routes)
 * هذا الملف يحتوي على جميع المسارات المتعلقة بإدارة الكتب
 * يشمل: عرض، إضافة، تعديل، حذف الكتب
 */

import express from 'express';

// استيراد دوال التحكم بالكتب
import {
  getAllBooks,      // جلب جميع الكتب
  getBookById,      // جلب كتاب محدد بالمعرف
  createBook,       // إضافة كتاب جديد
  updateBook,       // تعديل بيانات كتاب
  deleteBook,       // حذف كتاب
  getBookStats,     // إحصائيات الكتب
  uploadBookCover   // رفع صورة غلاف الكتاب
} from '../controllers/book.controller.js';

// استيراد وسيط المصادقة والصلاحيات
import { authenticate, authorize } from '../middleware/auth.middleware.js';

// استيراد وسيط رفع الصور
import { uploadCover, handleUploadError } from '../middleware/upload.middleware.js';

// إنشاء موجه Express
const router = express.Router();

// ==================== المسارات العامة ====================
// هذا المسار لا يحتاج تسجيل دخول (للوصول عبر مسح QR)

/**
 * الحصول على تفاصيل كتاب للعرض العام
 * GET /api/books/public/:id
 *
 * هذا المسار يُستخدم عند مسح رمز QR للكتاب
 * يسمح لأي شخص برؤية تفاصيل الكتاب بدون تسجيل دخول
 */
router.get('/public/:id', getBookById);

// ==================== المسارات المحمية ====================
// جميع المسارات التالية تتطلب تسجيل دخول

/**
 * الحصول على جميع الكتب
 * GET /api/books
 *
 * يدعم الفلترة والبحث:
 * - search: البحث في العنوان أو المؤلف
 * - categoryId: تصفية حسب التصنيف
 * - shelfId: تصفية حسب الرف
 * - status: تصفية حسب الحالة
 * - page: رقم الصفحة
 * - limit: عدد النتائج في الصفحة
 */
router.get('/', authenticate, getAllBooks);

/**
 * الحصول على إحصائيات الكتب
 * GET /api/books/stats
 *
 * يُرجع:
 * - إجمالي عدد الكتب
 * - عدد الكتب المتاحة
 * - عدد الكتب المُستعارة
 */
router.get('/stats', authenticate, getBookStats);

/**
 * الحصول على كتاب محدد بالمعرف
 * GET /api/books/:id
 *
 * يُرجع جميع تفاصيل الكتاب مع التصنيف والرف
 */
router.get('/:id', authenticate, getBookById);

/**
 * إضافة كتاب جديد
 * POST /api/books
 *
 * الصلاحيات: مدير (ADMIN) أو موظف (STAFF)
 *
 * البيانات المطلوبة:
 * - title: عنوان الكتاب (مطلوب)
 * - author: اسم المؤلف (مطلوب)
 * - isbn: رقم ISBN (اختياري)
 * - categoryId: معرف التصنيف (اختياري)
 * - shelfId: معرف الرف (اختياري)
 * - copiesTotal: عدد النسخ الكلي
 * - description: وصف الكتاب
 * - publicationYear: سنة النشر
 */
router.post('/', authenticate, authorize('ADMIN', 'STAFF'), createBook);

/**
 * تعديل بيانات كتاب
 * PUT /api/books/:id
 *
 * الصلاحيات: مدير (ADMIN) أو موظف (STAFF)
 * يمكن تعديل أي حقل من حقول الكتاب
 */
router.put('/:id', authenticate, authorize('ADMIN', 'STAFF'), updateBook);

/**
 * حذف كتاب
 * DELETE /api/books/:id
 *
 * الصلاحيات: مدير (ADMIN) فقط
 * تحذير: هذه العملية لا يمكن التراجع عنها
 */
router.delete('/:id', authenticate, authorize('ADMIN'), deleteBook);

/**
 * رفع صورة غلاف الكتاب
 * POST /api/books/:id/cover
 *
 * الصلاحيات: مدير (ADMIN) أو موظف (STAFF)
 * يقبل ملف صورة واحد في حقل coverImage
 */
router.post('/:id/cover', authenticate, authorize('ADMIN', 'STAFF'), uploadCover, handleUploadError, uploadBookCover);

// تصدير الموجه
export default router;
