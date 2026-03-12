/**
 * وسيط معالجة الأخطاء (Error Handling Middleware)
 * ================================================
 * هذا الملف يحتوي على:
 * 1. وسيط معالجة الأخطاء العامة
 * 2. فئة الأخطاء المخصصة (AppError)
 *
 * لماذا نحتاج معالجة أخطاء مركزية؟
 * - توحيد شكل رسائل الخطأ
 * - تسهيل تتبع الأخطاء
 * - منع تسرب معلومات حساسة
 */

/**
 * وسيط معالجة الأخطاء العامة
 * ==========================
 * يستقبل جميع الأخطاء التي تحدث في التطبيق ويُرسل استجابة مناسبة
 *
 * أنواع الأخطاء المُعالجة:
 * 1. أخطاء Prisma (قاعدة البيانات)
 * 2. أخطاء التحقق (Validation)
 * 3. أخطاء مخصصة (AppError)
 * 4. أخطاء غير متوقعة
 *
 * @param {Error} err - كائن الخطأ
 * @param {Request} req - كائن الطلب
 * @param {Response} res - كائن الاستجابة
 * @param {Function} next - الدالة التالية
 */
export const errorHandler = (err, req, res, next) => {
  // طباعة الخطأ في وحدة التحكم للتتبع
  console.error('خطأ:', err);

  // ===== أخطاء Prisma (قاعدة البيانات) =====

  // P2002: انتهاك قيد الفريدية (مثل: email مكرر)
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `يوجد سجل بنفس ${err.meta?.target?.[0] || 'القيمة'} مسبقاً`
      }
    });
  }

  // P2025: السجل غير موجود
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'السجل غير موجود'
      }
    });
  }

  // ===== أخطاء التحقق =====
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.errors // تفاصيل الأخطاء
      }
    });
  }

  // ===== الخطأ الافتراضي =====
  // إذا لم يُطابق أي نوع معروف
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'حدث خطأ غير متوقع',
      // في بيئة التطوير فقط: عرض تتبع الخطأ
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

/**
 * فئة الأخطاء المخصصة (AppError)
 * ==============================
 * تُستخدم لإنشاء أخطاء مُخصصة مع رمز وحالة HTTP محددة
 *
 * طريقة الاستخدام:
 * throw new AppError('الكتاب غير موجود', 'BOOK_NOT_FOUND', 404);
 *
 * @param {string} message - رسالة الخطأ
 * @param {string} code - رمز الخطأ (للتعريف البرمجي)
 * @param {number} status - كود حالة HTTP (افتراضي: 500)
 *
 * أكواد HTTP الشائعة:
 * - 400: طلب خاطئ (Bad Request)
 * - 401: غير مُصادق (Unauthorized)
 * - 403: محظور (Forbidden)
 * - 404: غير موجود (Not Found)
 * - 409: تعارض (Conflict)
 * - 500: خطأ داخلي (Internal Server Error)
 */
export class AppError extends Error {
  constructor(message, code, status = 500) {
    // استدعاء مُنشئ الفئة الأم (Error)
    super(message);

    // رمز الخطأ (مثل: BOOK_NOT_FOUND)
    this.code = code;

    // كود حالة HTTP
    this.status = status;

    // علامة للتمييز بين الأخطاء المتوقعة وغير المتوقعة
    this.isOperational = true;
  }
}
