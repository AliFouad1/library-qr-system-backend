/**
 * مسارات التقارير (Report Routes)
 * هذا الملف يحتوي على المسارات المتعلقة بالتقارير والإحصائيات
 * يُستخدم لعرض البيانات في لوحة التحكم
 */

import express from 'express';

// استيراد وسيط المصادقة
import { authenticate } from '../middleware/auth.middleware.js';

// استيراد Prisma للتعامل مع قاعدة البيانات
import { PrismaClient } from '@prisma/client';

// إنشاء موجه Express
const router = express.Router();

// إنشاء اتصال بقاعدة البيانات
const prisma = new PrismaClient();

/**
 * إحصائيات لوحة التحكم
 * GET /api/reports/dashboard
 *
 * يتطلب: تسجيل دخول
 *
 * يُرجع الإحصائيات الرئيسية:
 * - totalBooks: إجمالي عدد الكتب في المكتبة
 * - totalUsers: إجمالي عدد المستخدمين المسجلين
 * - activeBorrowings: عدد الاستعارات النشطة حالياً
 * - overdueBooks: عدد الكتب المتأخرة عن موعد الإرجاع
 *
 * هذه البيانات تُعرض في الصفحة الرئيسية للوحة التحكم
 */
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    // تنفيذ جميع الاستعلامات بالتوازي لتحسين الأداء
    const [totalBooks, totalUsers, activeBorrowings, overdueBooks] = await Promise.all([
      // عدد الكتب الكلي
      prisma.book.count(),

      // عدد المستخدمين الكلي
      prisma.user.count(),

      // عدد الاستعارات النشطة (الكتب المُستعارة حالياً)
      prisma.borrowing.count({ where: { status: 'BORROWED' } }),

      // عدد الكتب المتأخرة
      // (مُستعارة وتاريخ الإرجاع المتوقع قد مضى)
      prisma.borrowing.count({
        where: {
          status: 'BORROWED',
          expectedReturnDate: { lt: new Date() } // lt = less than = أقل من
        }
      })
    ]);

    // إرسال الإحصائيات
    res.json({
      success: true,
      data: { totalBooks, totalUsers, activeBorrowings, overdueBooks }
    });
  } catch (error) {
    // تمرير الخطأ للوسيط التالي
    next(error);
  }
});

// تصدير الموجه
export default router;
