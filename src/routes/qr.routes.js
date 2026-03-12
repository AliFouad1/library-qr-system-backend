/**
 * مسارات رمز QR (QR Code Routes)
 * هذا الملف يحتوي على المسارات المتعلقة بمسح رموز QR
 * يُستخدم لمسح رموز الكتب والرفوف
 */

import express from 'express';

// استيراد دوال مسح رمز QR
import { scanBookQR, scanShelfQR } from '../controllers/qr.controller.js';

// استيراد وسيط المصادقة
import { authenticate } from '../middleware/auth.middleware.js';

// إنشاء موجه Express
const router = express.Router();

/**
 * مسح رمز QR لكتاب
 * POST /api/qr/scan/book
 *
 * يتطلب: تسجيل دخول
 *
 * البيانات المطلوبة:
 * - qrData: البيانات المُستخرجة من رمز QR
 *
 * يُرجع:
 * - بيانات الكتاب الكاملة
 * - حالة التوفر
 * - معلومات الاستعارة الحالية (إن وجدت)
 *
 * يُستخدم عند مسح رمز QR الموجود على الكتاب
 * للحصول على معلوماته بسرعة
 */
router.post('/scan/book', authenticate, scanBookQR);

/**
 * مسح رمز QR لرف
 * POST /api/qr/scan/shelf
 *
 * يتطلب: تسجيل دخول
 *
 * البيانات المطلوبة:
 * - qrData: البيانات المُستخرجة من رمز QR
 *
 * يُرجع:
 * - بيانات الرف
 * - قائمة الكتب الموجودة على هذا الرف
 *
 * يُستخدم لجرد الكتب على رف معين
 * أو للتحقق من وجود الكتب في مكانها الصحيح
 */
router.post('/scan/shelf', authenticate, scanShelfQR);

// تصدير الموجه
export default router;
