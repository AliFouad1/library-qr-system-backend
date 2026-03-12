/**
 * مسارات المصادقة (Authentication Routes)
 * هذا الملف يحتوي على جميع المسارات المتعلقة بتسجيل الدخول والمصادقة
 */

import express from 'express';

// استيراد دوال التحكم من ملف المصادقة
// login: دالة تسجيل الدخول
// getCurrentUser: دالة الحصول على بيانات المستخدم الحالي
import {
  login,
  getCurrentUser
} from '../controllers/auth.controller.js';

// استيراد وسيط المصادقة للتحقق من صلاحية المستخدم
import { authenticate } from '../middleware/auth.middleware.js';

// إنشاء موجه Express للتعامل مع المسارات
const router = express.Router();

// ==================== المسارات العامة ====================
// هذه المسارات لا تحتاج إلى تسجيل دخول

/**
 * مسار تسجيل الدخول
 * POST /api/auth/login
 * يستقبل: email (البريد الإلكتروني) و password (كلمة المرور)
 * يُرجع: بيانات المستخدم + رمز الوصول (token)
 */
router.post('/login', login);

// ==================== المسارات المحمية ====================
// هذه المسارات تتطلب تسجيل دخول (token صالح)

/**
 * مسار الحصول على بيانات المستخدم الحالي
 * GET /api/auth/me
 * يتطلب: رمز وصول صالح في الهيدر (Authorization: Bearer token)
 * يُرجع: بيانات المستخدم المسجل حالياً
 */
router.get('/me', authenticate, getCurrentUser);

// تصدير الموجه لاستخدامه في الملف الرئيسي
export default router;
