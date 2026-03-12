/**
 * مسارات الاستعارة (Borrowing Routes)
 * هذا الملف يحتوي على جميع المسارات المتعلقة بعمليات استعارة وإرجاع الكتب
 */

import express from 'express';

// استيراد دوال التحكم بالاستعارة
import {
  borrowBook,        // استعارة كتاب
  returnBook,        // إرجاع كتاب
  getAllBorrowings,  // جلب جميع عمليات الاستعارة
  extendBorrowing,   // تمديد فترة الاستعارة
  getBorrowingStats  // إحصائيات الاستعارة
} from '../controllers/borrowing.controller.js';

// استيراد وسيط المصادقة والصلاحيات
import { authenticate, authorize } from '../middleware/auth.middleware.js';

// إنشاء موجه Express
const router = express.Router();

/**
 * استعارة كتاب
 * POST /api/borrowing/borrow
 *
 * الصلاحيات: مدير (ADMIN) أو موظف (STAFF)
 *
 * البيانات المطلوبة:
 * - userId: معرف المستخدم المستعير
 * - bookId: معرف الكتاب
 * - borrowDays: عدد أيام الاستعارة (اختياري، الافتراضي 14 يوم)
 *
 * الشروط:
 * - يجب أن يكون الكتاب متاحاً
 * - يجب ألا يتجاوز المستخدم الحد الأقصى للاستعارة (5 كتب)
 */
router.post('/borrow', authenticate, authorize('ADMIN', 'STAFF'), borrowBook);

/**
 * إرجاع كتاب
 * POST /api/borrowing/return/:borrowingId
 *
 * الصلاحيات: مدير (ADMIN) أو موظف (STAFF)
 *
 * المعامل:
 * - borrowingId: معرف عملية الاستعارة
 *
 * هذه العملية:
 * - تُحدّث حالة الاستعارة إلى "مُرجَع"
 * - تُحدّث تاريخ الإرجاع الفعلي
 * - تزيد عدد النسخ المتاحة للكتاب
 */
router.post('/return/:borrowingId', authenticate, authorize('ADMIN', 'STAFF'), returnBook);

/**
 * الحصول على جميع عمليات الاستعارة
 * GET /api/borrowing
 *
 * يتطلب: تسجيل دخول
 *
 * يدعم الفلترة:
 * - status: حالة الاستعارة (BORROWED/RETURNED/OVERDUE)
 * - page: رقم الصفحة
 * - limit: عدد النتائج
 *
 * يُرجع قائمة بجميع عمليات الاستعارة مع بيانات المستخدم والكتاب
 */
router.get('/', authenticate, getAllBorrowings);

/**
 * الحصول على إحصائيات الاستعارة
 * GET /api/borrowing/stats
 *
 * يتطلب: تسجيل دخول
 *
 * يُرجع:
 * - إجمالي عمليات الاستعارة
 * - الاستعارات النشطة حالياً
 * - الكتب المتأخرة
 */
router.get('/stats', authenticate, getBorrowingStats);

/**
 * تمديد فترة الاستعارة
 * PUT /api/borrowing/:borrowingId/extend
 *
 * الصلاحيات: مدير (ADMIN) أو موظف (STAFF)
 *
 * المعامل:
 * - borrowingId: معرف عملية الاستعارة
 *
 * البيانات:
 * - additionalDays: عدد الأيام الإضافية (اختياري، الافتراضي 7 أيام)
 *
 * يُستخدم عندما يحتاج المستخدم وقتاً إضافياً للكتاب
 */
router.put('/:borrowingId/extend', authenticate, authorize('ADMIN', 'STAFF'), extendBorrowing);

// تصدير الموجه
export default router;
