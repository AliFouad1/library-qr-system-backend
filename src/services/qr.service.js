/**
 * خدمة رمز QR (QR Code Service)
 * ==============================
 * هذا الملف يحتوي على جميع الدوال المتعلقة برموز QR
 *
 * ما هو رمز QR؟
 * - رمز استجابة سريعة (Quick Response)
 * - يحتوي على معلومات يمكن قراءتها بالكاميرا
 * - يُستخدم في هذا النظام لتعريف الكتب والرفوف
 *
 * الدوال المتاحة:
 * - generateBookQRCode: توليد رمز QR لكتاب
 * - generateShelfQRCode: توليد رمز QR لرف
 * - scanBook: مسح رمز QR لكتاب
 * - scanShelf: مسح رمز QR لرف
 */

// استيراد مكتبة توليد رموز QR
import QRCode from 'qrcode';

// استيراد Prisma للتعامل مع قاعدة البيانات
import { PrismaClient } from '@prisma/client';

// إنشاء اتصال بقاعدة البيانات
const prisma = new PrismaClient();

/**
 * توليد رمز QR لكتاب
 * ===================
 * يُنشئ رمز QR يحتوي على رابط لصفحة الكتاب
 *
 * @param {string} bookId - معرف الكتاب (UUID)
 * @returns {Promise<string>} - صورة QR بصيغة Base64
 *
 * محتوى الرمز:
 * - رابط URL لصفحة تفاصيل الكتاب
 * - مثال: http://localhost:3000/book/abc123
 *
 * إعدادات الرمز:
 * - مستوى تصحيح الخطأ: عالي (H) - يعمل حتى لو تلف 30% منه
 * - الحجم: 300x300 بكسل
 * - الهامش: 2 وحدات
 */
export const generateBookQRCode = async (bookId) => {
  try {
    // ===== التحقق من وجود الكتاب =====
    const book = await prisma.book.findUnique({
      where: { id: bookId }
    });

    if (!book) {
      throw new Error('الكتاب غير موجود');
    }

    // ===== بناء رابط الكتاب =====
    // الرابط الأساسي من إعدادات البيئة أو الافتراضي
    const baseUrl = process.env.QR_CODE_BASE_URL || 'http://localhost:3000/book';
    const qrData = `${baseUrl}/${bookId}`;

    // ===== توليد صورة QR =====
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H', // مستوى تصحيح خطأ عالي
      type: 'image/png', // صيغة PNG
      width: 300, // العرض بالبكسل
      margin: 2, // الهامش
      color: {
        dark: '#000000', // لون الرمز (أسود)
        light: '#FFFFFF' // لون الخلفية (أبيض)
      }
    });

    // ===== حفظ الرمز في قاعدة البيانات =====
    await prisma.book.update({
      where: { id: bookId },
      data: { qrCode: qrCodeDataURL }
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('خطأ في توليد رمز QR للكتاب:', error);
    throw error;
  }
};

/**
 * توليد رمز QR لرف
 * =================
 * يُنشئ رمز QR يحتوي على رابط لصفحة الرف
 *
 * @param {string} shelfId - معرف الرف (UUID)
 * @returns {Promise<string>} - صورة QR بصيغة Base64
 */
export const generateShelfQRCode = async (shelfId) => {
  try {
    // التحقق من وجود الرف
    const shelf = await prisma.shelf.findUnique({
      where: { id: shelfId }
    });

    if (!shelf) {
      throw new Error('الرف غير موجود');
    }

    // بناء رابط الرف
    const baseUrl = process.env.QR_CODE_BASE_URL || 'http://localhost:3000/book';
    const qrData = `${baseUrl.replace('/book', '/shelf')}/${shelfId}`;

    // توليد صورة QR
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // حفظ الرمز في قاعدة البيانات
    await prisma.shelf.update({
      where: { id: shelfId },
      data: { qrCode: qrCodeDataURL }
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('خطأ في توليد رمز QR للرف:', error);
    throw error;
  }
};

/**
 * مسح رمز QR لكتاب
 * =================
 * يجلب تفاصيل الكتاب بعد مسح رمز QR الخاص به
 *
 * @param {string} bookId - معرف الكتاب من رمز QR
 * @returns {Promise<Object>} - تفاصيل الكتاب مع حالة التوفر
 *
 * المخرجات تشمل:
 * - بيانات الكتاب الأساسية
 * - التصنيف والرف
 * - سجل الاستعارات
 * - حالة التوفر
 * - المستعير الحالي (إن وجد)
 */
export const scanBook = async (bookId) => {
  // جلب بيانات الكتاب مع العلاقات
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      category: true, // التصنيف
      shelf: true, // الرف
      // الاستعارات النشطة
      borrowings: {
        where: {
          status: 'BORROWED'
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          }
        },
        orderBy: {
          borrowDate: 'desc'
        }
      }
    }
  });

  if (!book) {
    throw new Error('الكتاب غير موجود');
  }

  // جلب سجل الاستعارات (آخر 10)
  const borrowingHistory = await prisma.borrowing.findMany({
    where: {
      bookId: book.id
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true
        }
      }
    },
    orderBy: {
      borrowDate: 'desc'
    },
    take: 10
  });

  // إرجاع البيانات مع معلومات إضافية
  return {
    ...book,
    borrowingHistory, // سجل الاستعارات
    isAvailable: book.copiesAvailable > 0, // هل متاح؟
    currentBorrower: book.borrowings[0] || null // المستعير الحالي
  };
};

/**
 * مسح رمز QR لرف
 * ===============
 * يجلب تفاصيل الرف والكتب الموجودة عليه
 *
 * @param {string} shelfId - معرف الرف من رمز QR
 * @returns {Promise<Object>} - تفاصيل الرف مع إحصائيات الكتب
 *
 * يُستخدم لـ:
 * - جرد الكتب على رف معين
 * - التحقق من وجود الكتب في مكانها الصحيح
 * - معرفة الكتب المُستعارة من الرف
 */
export const scanShelf = async (shelfId) => {
  // جلب بيانات الرف مع الكتب
  const shelf = await prisma.shelf.findUnique({
    where: { id: shelfId },
    include: {
      books: {
        include: {
          category: true,
          borrowings: {
            where: {
              status: 'BORROWED'
            }
          }
        }
      }
    }
  });

  if (!shelf) {
    throw new Error('الرف غير موجود');
  }

  // ===== تصنيف الكتب =====
  const expectedBooks = shelf.books; // جميع الكتب
  const availableBooks = expectedBooks.filter(book => book.copiesAvailable > 0); // المتاحة
  const borrowedBooks = expectedBooks.filter(book => book.borrowings.length > 0); // المُستعارة

  // إرجاع البيانات المُنظمة
  return {
    // بيانات الرف
    shelf: {
      id: shelf.id,
      shelfCode: shelf.shelfCode, // رمز الرف
      location: shelf.location, // الموقع
      floor: shelf.floor, // الطابق
      capacity: shelf.capacity, // السعة
      description: shelf.description
    },
    // الإحصائيات
    expectedBooks: expectedBooks.length, // إجمالي الكتب
    availableBooks: availableBooks.length, // المتاحة
    borrowedBooks: borrowedBooks.length, // المُستعارة
    // قائمة الكتب
    books: expectedBooks.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category?.name,
      copiesTotal: book.copiesTotal,
      copiesAvailable: book.copiesAvailable,
      status: book.status,
      isBorrowed: book.borrowings.length > 0
    }))
  };
};
