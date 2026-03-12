/**
 * مسارات المستخدمين (User Routes)
 * هذا الملف يحتوي على المسارات المتعلقة بإدارة المستخدمين
 */

import express from 'express';

// استيراد وسيط المصادقة والصلاحيات
// authenticate: للتحقق من تسجيل الدخول
// authorize: للتحقق من صلاحية المستخدم (مدير أو موظف)
import { authenticate, authorize } from '../middleware/auth.middleware.js';

// استيراد Prisma للتعامل مع قاعدة البيانات
import { PrismaClient } from '@prisma/client';

// إنشاء موجه Express
const router = express.Router();

// إنشاء اتصال بقاعدة البيانات
const prisma = new PrismaClient();

/**
 * الحصول على جميع المستخدمين
 * GET /api/users
 *
 * الصلاحيات المطلوبة: مدير (ADMIN) أو موظف (STAFF)
 *
 * يُرجع قائمة بجميع المستخدمين مع البيانات التالية:
 * - id: معرف المستخدم
 * - email: البريد الإلكتروني
 * - fullName: الاسم الكامل
 * - role: الدور (مدير/موظف/مستخدم)
 * - phone: رقم الهاتف
 * - status: الحالة (نشط/غير نشط/موقوف)
 * - createdAt: تاريخ الإنشاء
 */
router.get('/', authenticate, authorize('ADMIN', 'STAFF'), async (req, res, next) => {
  try {
    // جلب جميع المستخدمين من قاعدة البيانات
    const users = await prisma.user.findMany({
      // تحديد الحقول المطلوبة فقط (لأمان البيانات)
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true
        // ملاحظة: لا نُرجع كلمة المرور لأسباب أمنية
      }
    });

    // إرسال الاستجابة بنجاح مع البيانات
    res.json({ success: true, data: users });
  } catch (error) {
    // في حالة حدوث خطأ، تمريره للوسيط التالي
    next(error);
  }
});

// تصدير الموجه
export default router;
