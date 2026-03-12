/**
 * وحدة التحكم بالتصنيفات (Category Controller)
 * =============================================
 * هذا الملف يحتوي على الدوال المتعلقة بإدارة تصنيفات الكتب
 * مثل: خيال علمي، تاريخ، علوم، أدب، دين، إلخ
 *
 * الدوال المتاحة:
 * - getAllCategories: جلب جميع التصنيفات
 */

// استيراد Prisma للتعامل مع قاعدة البيانات
import { PrismaClient } from '@prisma/client';

// استيراد فئة الخطأ المخصصة
import { AppError } from '../middleware/error.middleware.js';

// إنشاء اتصال بقاعدة البيانات
const prisma = new PrismaClient();

/**
 * جلب جميع التصنيفات
 * GET /api/categories
 * ====================
 *
 * يُرجع قائمة بجميع تصنيفات الكتب مرتبة أبجدياً
 * مع عدد الكتب في كل تصنيف
 *
 * المخرجات لكل تصنيف:
 * - id: معرف التصنيف
 * - name: اسم التصنيف
 * - description: وصف التصنيف
 * - _count.books: عدد الكتب في هذا التصنيف
 */
export const getAllCategories = async (req, res, next) => {
  try {
    // جلب جميع التصنيفات مع عدد الكتب
    const categories = await prisma.category.findMany({
      include: {
        // حساب عدد الكتب في كل تصنيف
        _count: {
          select: { books: true }
        }
      },
      // الترتيب أبجدياً حسب الاسم
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};
