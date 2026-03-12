/**
 * وسيط المصادقة (Authentication Middleware)
 * ==========================================
 * هذا الملف يحتوي على الدوال الوسيطة للتحقق من هوية المستخدم وصلاحياته
 *
 * ما هو الوسيط (Middleware)؟
 * - هو دالة تُنفذ قبل وصول الطلب للمسار (Route)
 * - يمكنه السماح للطلب بالمتابعة أو رفضه
 * - يُستخدم للتحقق من تسجيل الدخول والصلاحيات
 *
 * الدوال المتاحة:
 * - authenticate: التحقق من رمز JWT
 * - authorize: التحقق من صلاحية الدور
 */

// استيراد مكتبة JWT للتحقق من الرموز
import jwt from 'jsonwebtoken';

// استيراد Prisma للتعامل مع قاعدة البيانات
import { PrismaClient } from '@prisma/client';

// إنشاء اتصال بقاعدة البيانات
const prisma = new PrismaClient();

/**
 * وسيط التحقق من رمز JWT
 * ======================
 * يتحقق من صحة رمز الوصول ويُرفق بيانات المستخدم بالطلب
 *
 * كيف يعمل:
 * 1. يستخرج الرمز من هيدر Authorization
 * 2. يفك تشفير الرمز ويتحقق من صلاحيته
 * 3. يجلب بيانات المستخدم من قاعدة البيانات
 * 4. يُرفق بيانات المستخدم بالطلب (req.user)
 *
 * صيغة الهيدر المتوقعة:
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */
export const authenticate = async (req, res, next) => {
  try {
    // ===== استخراج الرمز من الهيدر =====
    const authHeader = req.headers.authorization;

    // التحقق من وجود الهيدر وأنه يبدأ بـ 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'رمز المصادقة مطلوب'
        }
      });
    }

    // إزالة 'Bearer ' من بداية الرمز
    const token = authHeader.substring(7);

    // ===== التحقق من صحة الرمز =====
    // jwt.verify يفك تشفير الرمز ويتحقق من:
    // 1. الرمز غير مُعدل
    // 2. الرمز غير منتهي الصلاحية
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ===== جلب بيانات المستخدم =====
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true
      }
    });

    // التحقق من وجود المستخدم
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'المستخدم غير موجود'
        }
      });
    }

    // التحقق من أن الحساب نشط
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'حسابك غير نشط أو موقوف'
        }
      });
    }

    // ===== إرفاق بيانات المستخدم بالطلب =====
    // الآن يمكن الوصول إلى req.user في المسارات والدوال التالية
    req.user = user;

    // المتابعة للوسيط أو المسار التالي
    next();
  } catch (error) {
    // ===== معالجة أخطاء JWT =====

    // الرمز منتهي الصلاحية
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'انتهت صلاحية رمز المصادقة'
        }
      });
    }

    // الرمز غير صالح أو مُعدل
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'رمز المصادقة غير صالح'
        }
      });
    }

    // خطأ غير متوقع
    console.error('خطأ في المصادقة:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'فشل في المصادقة'
      }
    });
  }
};

/**
 * وسيط التحقق من الصلاحيات
 * ========================
 * يتحقق من أن المستخدم لديه الدور المطلوب
 *
 * الأدوار المتاحة:
 * - ADMIN: مدير النظام (كل الصلاحيات)
 * - STAFF: موظف المكتبة (إدارة الكتب والاستعارات)
 * - USER: مستخدم عادي (عرض واستعارة فقط)
 *
 * طريقة الاستخدام:
 * router.post('/books', authenticate, authorize('ADMIN', 'STAFF'), createBook);
 *
 * @param {string[]} allowedRoles - قائمة الأدوار المسموح بها
 */
export const authorize = (...allowedRoles) => {
  // نُرجع دالة وسيطة
  return (req, res, next) => {
    // التحقق من أن المستخدم مُصادق عليه
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'يجب تسجيل الدخول أولاً'
        }
      });
    }

    // التحقق من أن دور المستخدم ضمن الأدوار المسموح بها
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'ليس لديك صلاحية لتنفيذ هذا الإجراء'
        }
      });
    }

    // المتابعة للمسار التالي
    next();
  };
};
