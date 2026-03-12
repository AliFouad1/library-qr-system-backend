/**
 * وحدة التحكم بالمصادقة (Authentication Controller)
 * ==========================================
 * هذا الملف يحتوي على جميع الدوال المتعلقة بتسجيل الدخول وإدارة الجلسات
 *
 * الدوال المتاحة:
 * - login: تسجيل الدخول
 * - getCurrentUser: الحصول على بيانات المستخدم الحالي
 */

// استيراد Prisma للتعامل مع قاعدة البيانات
import { PrismaClient } from '@prisma/client';

// استيراد مكتبة bcrypt لتشفير وفحص كلمات المرور
import bcrypt from 'bcrypt';

// استيراد مكتبة JWT لإنشاء رموز الوصول
import jwt from 'jsonwebtoken';

// استيراد فئة الخطأ المخصصة
import { AppError } from '../middleware/error.middleware.js';

// إنشاء اتصال بقاعدة البيانات
const prisma = new PrismaClient();

/**
 * دالة توليد رمز الوصول (JWT Token)
 * ===================================
 * تُنشئ رمز وصول مُشفر يحتوي على معرف المستخدم
 *
 * @param {string} userId - معرف المستخدم
 * @returns {string} - رمز JWT مُشفر
 *
 * الرمز يحتوي على:
 * - userId: معرف المستخدم
 * - صلاحية: 24 ساعة (أو حسب إعدادات البيئة)
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, // البيانات المُخزنة في الرمز
    process.env.JWT_SECRET, // المفتاح السري للتشفير
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } // مدة الصلاحية
  );
};

/**
 * تسجيل الدخول
 * POST /api/auth/login
 * =====================
 * يتحقق من بيانات المستخدم ويُنشئ جلسة جديدة
 *
 * المدخلات المطلوبة:
 * @param {string} email - البريد الإلكتروني
 * @param {string} password - كلمة المرور
 *
 * المخرجات:
 * - بيانات المستخدم (بدون كلمة المرور)
 * - رمز الوصول (token)
 *
 * الأخطاء المحتملة:
 * - VALIDATION_ERROR: البريد أو كلمة المرور فارغة
 * - INVALID_CREDENTIALS: بيانات الدخول غير صحيحة
 * - ACCOUNT_INACTIVE: الحساب غير نشط أو موقوف
 */
export const login = async (req, res, next) => {
  try {
    // استخراج البريد وكلمة المرور من الطلب
    const { email, password } = req.body;

    // ===== التحقق من المدخلات =====
    if (!email || !password) {
      throw new AppError('البريد الإلكتروني وكلمة المرور مطلوبان', 'VALIDATION_ERROR', 400);
    }

    // ===== البحث عن المستخدم في قاعدة البيانات =====
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // إذا لم يُوجد المستخدم
    if (!user) {
      throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'INVALID_CREDENTIALS', 401);
    }

    // ===== التحقق من كلمة المرور =====
    // مقارنة كلمة المرور المُدخلة مع المُشفرة في قاعدة البيانات
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'INVALID_CREDENTIALS', 401);
    }

    // ===== التحقق من حالة الحساب =====
    // الحساب يجب أن يكون نشطاً (ACTIVE)
    if (user.status !== 'ACTIVE') {
      throw new AppError('حسابك غير نشط أو موقوف', 'ACCOUNT_INACTIVE', 403);
    }

    // ===== إنشاء رمز الوصول =====
    const token = generateToken(user.id);

    // ===== تسجيل العملية في سجل المراجعة =====
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN', // نوع العملية: تسجيل دخول
        ipAddress: req.ip // عنوان IP للمستخدم
      }
    });

    // ===== إعداد الاستجابة =====
    // إزالة كلمة المرور من البيانات المُرسلة
    const { password: _, ...userWithoutPassword } = user;

    // إرسال الاستجابة بنجاح
    res.json({
      success: true,
      data: {
        user: userWithoutPassword, // بيانات المستخدم
        token // رمز الوصول
      },
      message: 'تم تسجيل الدخول بنجاح'
    });
  } catch (error) {
    // تمرير الخطأ للوسيط التالي
    next(error);
  }
};

/**
 * الحصول على بيانات المستخدم الحالي
 * GET /api/auth/me
 * =================================
 * يُرجع بيانات المستخدم المسجل حالياً
 *
 * المتطلبات:
 * - يجب أن يكون المستخدم مُسجل الدخول (token صالح)
 *
 * المخرجات:
 * - id: معرف المستخدم
 * - email: البريد الإلكتروني
 * - fullName: الاسم الكامل
 * - role: الدور (ADMIN/STAFF/USER)
 * - phone: رقم الهاتف
 * - status: الحالة
 * - createdAt: تاريخ إنشاء الحساب
 * - updatedAt: تاريخ آخر تحديث
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    // جلب بيانات المستخدم من قاعدة البيانات
    // req.user.id يأتي من وسيط المصادقة (authenticate middleware)
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      // تحديد الحقول المطلوبة (بدون كلمة المرور)
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // إرسال البيانات
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};
