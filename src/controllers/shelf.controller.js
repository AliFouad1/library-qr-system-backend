/**
 * وحدة التحكم بالرفوف (Shelf Controller)
 * =======================================
 * هذا الملف يحتوي على الدوال المتعلقة بإدارة رفوف المكتبة
 * كل رف له رمز فريد وموقع محدد (طابق، قسم)
 *
 * الدوال المتاحة:
 * - getAllShelves: جلب جميع الرفوف
 */

// استيراد Prisma للتعامل مع قاعدة البيانات
import { PrismaClient } from '@prisma/client';

// استيراد فئة الخطأ المخصصة
import { AppError } from '../middleware/error.middleware.js';

// إنشاء اتصال بقاعدة البيانات
const prisma = new PrismaClient();

/**
 * جلب جميع الرفوف
 * GET /api/shelves
 * =================
 *
 * يُرجع قائمة بجميع رفوف المكتبة مرتبة حسب رمز الرف
 * مع عدد الكتب على كل رف
 *
 * المخرجات لكل رف:
 * - id: معرف الرف
 * - shelfCode: رمز الرف (مثل: A1, B2, C3)
 * - location: الموقع (مثل: الجناح الشرقي، القاعة الرئيسية)
 * - floor: رقم الطابق
 * - capacity: السعة الاستيعابية (عدد الكتب)
 * - description: وصف الرف
 * - qrCode: رمز QR للرف (صورة Base64)
 * - _count.books: عدد الكتب الحالي على الرف
 */
export const getAllShelves = async (req, res, next) => {
  try {
    // جلب جميع الرفوف مع عدد الكتب
    const shelves = await prisma.shelf.findMany({
      include: {
        // حساب عدد الكتب على كل رف
        _count: { select: { books: true } }
      },
      // الترتيب حسب رمز الرف
      orderBy: { shelfCode: 'asc' }
    });

    res.json({ success: true, data: shelves });
  } catch (error) {
    next(error);
  }
};
