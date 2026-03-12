/**
 * وحدة التحكم برمز QR (QR Code Controller)
 * =========================================
 * هذا الملف يحتوي على الدوال المتعلقة بمسح رموز QR
 * يُستخدم لمسح رموز الكتب والرفوف
 *
 * الدوال المتاحة:
 * - scanBookQR: مسح رمز QR لكتاب
 * - scanShelfQR: مسح رمز QR لرف
 */

// استيراد دوال خدمة QR
import { scanBook, scanShelf } from '../services/qr.service.js';

// استيراد فئة الخطأ المخصصة
import { AppError } from '../middleware/error.middleware.js';

/**
 * مسح رمز QR لكتاب
 * POST /api/qr/scan/book
 * =======================
 *
 * البيانات المقبولة:
 * @param {string} bookId - معرف الكتاب مباشرة (اختياري)
 * @param {string} qrData - بيانات QR المُمسوحة (اختياري)
 *
 * يجب توفير أحدهما على الأقل
 *
 * صيغة qrData المتوقعة (JSON):
 * {
 *   "type": "BOOK",
 *   "id": "معرف_الكتاب"
 * }
 *
 * المخرجات:
 * - بيانات الكتاب الكاملة
 * - حالة التوفر
 * - معلومات الاستعارة الحالية (إن وجدت)
 */
export const scanBookQR = async (req, res, next) => {
  try {
    const { bookId, qrData } = req.body;

    let id = bookId;

    // ===== استخراج معرف الكتاب من بيانات QR =====
    if (qrData) {
      try {
        // تحليل بيانات JSON
        const parsed = JSON.parse(qrData);

        // التحقق من أن النوع "BOOK" والمعرف موجود
        if (parsed.type === 'BOOK' && parsed.id) {
          id = parsed.id;
        }
      } catch {
        // خطأ في تحليل JSON
        throw new AppError('صيغة بيانات QR غير صالحة', 'INVALID_QR', 400);
      }
    }

    // ===== التحقق من وجود المعرف =====
    if (!id) {
      throw new AppError('معرف الكتاب أو بيانات QR مطلوبة', 'VALIDATION_ERROR', 400);
    }

    // ===== جلب تفاصيل الكتاب =====
    // دالة scanBook موجودة في qr.service.js
    const bookDetails = await scanBook(id);

    res.json({
      success: true,
      data: bookDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * مسح رمز QR لرف
 * POST /api/qr/scan/shelf
 * ========================
 *
 * البيانات المقبولة:
 * @param {string} shelfId - معرف الرف مباشرة (اختياري)
 * @param {string} qrData - بيانات QR المُمسوحة (اختياري)
 *
 * يجب توفير أحدهما على الأقل
 *
 * صيغة qrData المتوقعة (JSON):
 * {
 *   "type": "SHELF",
 *   "id": "معرف_الرف"
 * }
 *
 * المخرجات:
 * - بيانات الرف
 * - قائمة الكتب الموجودة على هذا الرف
 *
 * الاستخدام:
 * - جرد الكتب على رف معين
 * - التحقق من وجود الكتب في مكانها الصحيح
 */
export const scanShelfQR = async (req, res, next) => {
  try {
    const { shelfId, qrData } = req.body;

    let id = shelfId;

    // ===== استخراج معرف الرف من بيانات QR =====
    if (qrData) {
      try {
        // تحليل بيانات JSON
        const parsed = JSON.parse(qrData);

        // التحقق من أن النوع "SHELF" والمعرف موجود
        if (parsed.type === 'SHELF' && parsed.id) {
          id = parsed.id;
        }
      } catch {
        // خطأ في تحليل JSON
        throw new AppError('صيغة بيانات QR غير صالحة', 'INVALID_QR', 400);
      }
    }

    // ===== التحقق من وجود المعرف =====
    if (!id) {
      throw new AppError('معرف الرف أو بيانات QR مطلوبة', 'VALIDATION_ERROR', 400);
    }

    // ===== جلب تفاصيل الرف =====
    // دالة scanShelf موجودة في qr.service.js
    const shelfDetails = await scanShelf(id);

    res.json({
      success: true,
      data: shelfDetails
    });
  } catch (error) {
    next(error);
  }
};
