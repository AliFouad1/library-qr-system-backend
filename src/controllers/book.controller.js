/**
 * وحدة التحكم بالكتب (Book Controller)
 * =====================================
 * هذا الملف يحتوي على جميع الدوال المتعلقة بإدارة الكتب
 *
 * الدوال المتاحة:
 * - getAllBooks: جلب جميع الكتب مع الفلترة والترقيم
 * - getBookById: جلب كتاب واحد بالمعرف
 * - createBook: إضافة كتاب جديد
 * - updateBook: تعديل بيانات كتاب
 * - deleteBook: حذف كتاب
 * - getBookStats: إحصائيات الكتب
 */

// استيراد Prisma للتعامل مع قاعدة البيانات
import { PrismaClient } from '@prisma/client';

// استيراد فئة الخطأ المخصصة
import { AppError } from '../middleware/error.middleware.js';

// استيراد دالة توليد رمز QR
import { generateBookQRCode } from '../services/qr.service.js';

// إنشاء اتصال بقاعدة البيانات
const prisma = new PrismaClient();

/**
 * جلب جميع الكتب مع الفلترة والترقيم
 * GET /api/books
 * =======================================
 *
 * معاملات الاستعلام (Query Parameters):
 * @param {number} page - رقم الصفحة (افتراضي: 1)
 * @param {number} limit - عدد النتائج في الصفحة (افتراضي: 10)
 * @param {string} search - نص البحث (في العنوان، المؤلف، ISBN)
 * @param {string} categoryId - تصفية حسب التصنيف
 * @param {string} shelfId - تصفية حسب الرف
 * @param {string} status - تصفية حسب الحالة (AVAILABLE/BORROWED/MAINTENANCE/LOST)
 *
 * المخرجات:
 * - books: مصفوفة الكتب
 * - pagination: معلومات الترقيم (الإجمالي، الصفحة الحالية، عدد الصفحات)
 */
export const getAllBooks = async (req, res, next) => {
  try {
    // استخراج معاملات الاستعلام مع القيم الافتراضية
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      shelfId,
      status
    } = req.query;

    // حساب عدد السجلات المُتخطاة (للترقيم)
    // مثال: الصفحة 2 مع 10 نتائج = تخطي أول 10 سجلات
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // ===== بناء شروط الفلترة =====
    const where = {};

    // فلتر البحث النصي
    // يبحث في: العنوان، المؤلف، رقم ISBN
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } }, // البحث في العنوان
        { author: { contains: search, mode: 'insensitive' } }, // البحث في المؤلف
        { isbn: { contains: search, mode: 'insensitive' } } // البحث في ISBN
      ];
    }

    // فلتر التصنيف
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // فلتر الرف
    if (shelfId) {
      where.shelfId = shelfId;
    }

    // فلتر الحالة
    if (status) {
      where.status = status;
    }

    // ===== تنفيذ الاستعلامات بالتوازي =====
    // نجلب الكتب وعددها الإجمالي في نفس الوقت لتحسين الأداء
    const [books, total] = await Promise.all([
      // جلب الكتب
      prisma.book.findMany({
        where,
        // تضمين البيانات المرتبطة
        include: {
          category: true, // بيانات التصنيف
          shelf: true, // بيانات الرف
          // جلب آخر استعارة نشطة (إن وجدت)
          borrowings: {
            where: { status: 'BORROWED' },
            take: 1,
            orderBy: { borrowDate: 'desc' }
          }
        },
        skip, // تخطي السجلات السابقة
        take: parseInt(limit), // عدد السجلات المطلوبة
        orderBy: { createdAt: 'desc' } // الترتيب: الأحدث أولاً
      }),
      // عد إجمالي الكتب المطابقة
      prisma.book.count({ where })
    ]);

    // إرسال الاستجابة
    res.json({
      success: true,
      data: {
        books,
        pagination: {
          total, // إجمالي عدد الكتب
          page: parseInt(page), // الصفحة الحالية
          limit: parseInt(limit), // عدد النتائج في الصفحة
          totalPages: Math.ceil(total / parseInt(limit)) // إجمالي عدد الصفحات
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * جلب كتاب واحد بالمعرف
 * GET /api/books/:id
 * GET /api/books/public/:id (للعامة)
 * ==================================
 *
 * @param {string} id - معرف الكتاب
 *
 * المخرجات:
 * - بيانات الكتاب الكاملة
 * - التصنيف والرف
 * - آخر 10 عمليات استعارة
 */
export const getBookById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // جلب الكتاب مع البيانات المرتبطة
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        category: true, // التصنيف
        shelf: true, // الرف
        // آخر 10 عمليات استعارة مع بيانات المستعير
        borrowings: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          },
          orderBy: { borrowDate: 'desc' },
          take: 10
        }
      }
    });

    // إذا لم يُوجد الكتاب
    if (!book) {
      throw new AppError('الكتاب غير موجود', 'BOOK_NOT_FOUND', 404);
    }

    res.json({
      success: true,
      data: book
    });
  } catch (error) {
    next(error);
  }
};

/**
 * إضافة كتاب جديد
 * POST /api/books
 * ================
 * الصلاحيات: مدير أو موظف فقط
 *
 * البيانات المطلوبة:
 * @param {string} title - عنوان الكتاب (مطلوب)
 * @param {string} author - اسم المؤلف (مطلوب)
 * @param {string} isbn - رقم ISBN (اختياري، فريد)
 * @param {string} categoryId - معرف التصنيف (اختياري)
 * @param {string} shelfId - معرف الرف (اختياري)
 * @param {number} copiesTotal - عدد النسخ (افتراضي: 1)
 * @param {string} description - وصف الكتاب (اختياري)
 * @param {number} publicationYear - سنة النشر (اختياري)
 *
 * العملية:
 * 1. التحقق من صحة البيانات
 * 2. التحقق من عدم تكرار ISBN
 * 3. إنشاء الكتاب في قاعدة البيانات
 * 4. توليد رمز QR للكتاب
 * 5. تسجيل العملية في سجل المراجعة
 */
export const createBook = async (req, res, next) => {
  try {
    // استخراج البيانات من الطلب
    const {
      title,
      author,
      isbn,
      categoryId,
      shelfId,
      copiesTotal,
      description,
      publicationYear
    } = req.body;

    // ===== التحقق من المدخلات =====
    if (!title || !author) {
      throw new AppError('العنوان واسم المؤلف مطلوبان', 'VALIDATION_ERROR', 400);
    }

    // ===== التحقق من عدم تكرار ISBN =====
    if (isbn) {
      const existingBook = await prisma.book.findUnique({
        where: { isbn }
      });

      if (existingBook) {
        throw new AppError('يوجد كتاب آخر بنفس رقم ISBN', 'ISBN_EXISTS', 409);
      }
    }

    // ===== إنشاء الكتاب =====
    const book = await prisma.book.create({
      data: {
        title,
        author,
        isbn,
        categoryId,
        shelfId,
        copiesTotal: copiesTotal || 1, // افتراضي: نسخة واحدة
        copiesAvailable: copiesTotal || 1, // في البداية: جميع النسخ متاحة
        description,
        publicationYear,
        status: 'AVAILABLE' // الحالة: متاح
      },
      include: {
        category: true,
        shelf: true
      }
    });

    // ===== توليد رمز QR =====
    // رمز QR يحتوي على رابط لصفحة الكتاب
    const qrCode = await generateBookQRCode(book.id);

    // تحديث الكتاب برمز QR
    const updatedBook = await prisma.book.update({
      where: { id: book.id },
      data: { qrCode },
      include: {
        category: true,
        shelf: true
      }
    });

    // ===== تسجيل العملية =====
    await prisma.auditLog.create({
      data: {
        userId: req.user.id, // من قام بالعملية
        bookId: book.id,
        action: 'BOOK_CREATED', // نوع العملية
        newValue: {
          title: book.title,
          author: book.author,
          isbn: book.isbn
        },
        ipAddress: req.ip
      }
    });

    // إرسال الاستجابة
    res.status(201).json({
      success: true,
      data: updatedBook,
      message: 'تم إضافة الكتاب بنجاح مع رمز QR'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * تعديل بيانات كتاب
 * PUT /api/books/:id
 * ===================
 * الصلاحيات: مدير أو موظف فقط
 *
 * @param {string} id - معرف الكتاب
 *
 * يمكن تعديل أي حقل من حقول الكتاب
 * النظام يتحقق من:
 * - وجود الكتاب
 * - عدم تكرار ISBN (إذا تم تغييره)
 * - منطقية عدد النسخ (المتاحة <= الإجمالية)
 */
export const updateBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      author,
      isbn,
      categoryId,
      shelfId,
      copiesTotal,
      copiesAvailable,
      description,
      publicationYear,
      status
    } = req.body;

    // ===== التحقق من وجود الكتاب =====
    const existingBook = await prisma.book.findUnique({
      where: { id }
    });

    if (!existingBook) {
      throw new AppError('الكتاب غير موجود', 'BOOK_NOT_FOUND', 404);
    }

    // ===== التحقق من ISBN =====
    if (isbn && isbn !== existingBook.isbn) {
      const duplicateIsbn = await prisma.book.findUnique({
        where: { isbn }
      });

      if (duplicateIsbn) {
        throw new AppError('يوجد كتاب آخر بنفس رقم ISBN', 'ISBN_EXISTS', 409);
      }
    }

    // ===== التحقق من منطقية عدد النسخ =====
    if (copiesAvailable !== undefined && copiesTotal !== undefined) {
      if (copiesAvailable > copiesTotal) {
        throw new AppError(
          'عدد النسخ المتاحة لا يمكن أن يتجاوز العدد الإجمالي',
          'VALIDATION_ERROR',
          400
        );
      }
    }

    // ===== تحديث الكتاب =====
    // نستخدم الصيغة الشرطية لتحديث الحقول المُرسلة فقط
    const book = await prisma.book.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(author && { author }),
        ...(isbn !== undefined && { isbn }),
        ...(categoryId !== undefined && { categoryId }),
        ...(shelfId !== undefined && { shelfId }),
        ...(copiesTotal !== undefined && { copiesTotal }),
        ...(copiesAvailable !== undefined && { copiesAvailable }),
        ...(description !== undefined && { description }),
        ...(publicationYear !== undefined && { publicationYear }),
        ...(status && { status })
      },
      include: {
        category: true,
        shelf: true
      }
    });

    // ===== تسجيل العملية =====
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        bookId: book.id,
        action: 'BOOK_UPDATED',
        oldValue: existingBook, // القيم القديمة
        newValue: book, // القيم الجديدة
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      data: book,
      message: 'تم تحديث الكتاب بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * حذف كتاب
 * DELETE /api/books/:id
 * ======================
 * الصلاحيات: مدير فقط
 *
 * الشروط:
 * - يجب أن يكون الكتاب موجوداً
 * - يجب ألا يكون للكتاب استعارات نشطة
 *
 * تحذير: هذه العملية لا يمكن التراجع عنها!
 */
export const deleteBook = async (req, res, next) => {
  try {
    const { id } = req.params;

    // ===== التحقق من الاستعارات النشطة =====
    const activeBorrowings = await prisma.borrowing.count({
      where: {
        bookId: id,
        status: 'BORROWED'
      }
    });

    if (activeBorrowings > 0) {
      throw new AppError(
        'لا يمكن حذف كتاب له استعارات نشطة',
        'ACTIVE_BORROWINGS',
        400
      );
    }

    // ===== التحقق من وجود الكتاب =====
    const book = await prisma.book.findUnique({
      where: { id }
    });

    if (!book) {
      throw new AppError('الكتاب غير موجود', 'BOOK_NOT_FOUND', 404);
    }

    // ===== حذف الكتاب =====
    await prisma.book.delete({
      where: { id }
    });

    // ===== تسجيل العملية =====
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'BOOK_DELETED',
        oldValue: {
          id: book.id,
          title: book.title,
          author: book.author
        },
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      message: 'تم حذف الكتاب بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * إحصائيات الكتب
 * GET /api/books/stats
 * =====================
 *
 * يُرجع إحصائيات شاملة عن الكتب:
 * - totalBooks: إجمالي عدد الكتب
 * - availableBooks: الكتب المتاحة
 * - borrowedBooks: الكتب المُستعارة
 * - maintenanceBooks: الكتب تحت الصيانة
 * - lostBooks: الكتب المفقودة
 * - totalCopies: إجمالي عدد النسخ
 * - availableCopies: النسخ المتاحة
 */
export const getBookStats = async (req, res, next) => {
  try {
    // تنفيذ جميع الاستعلامات بالتوازي لتحسين الأداء
    const [
      totalBooks,
      availableBooks,
      borrowedBooks,
      maintenanceBooks,
      lostBooks,
      totalCopies,
      availableCopies
    ] = await Promise.all([
      // عدد الكتب الإجمالي
      prisma.book.count(),
      // عدد الكتب المتاحة
      prisma.book.count({ where: { status: 'AVAILABLE' } }),
      // عدد الكتب المُستعارة
      prisma.book.count({ where: { status: 'BORROWED' } }),
      // عدد الكتب تحت الصيانة
      prisma.book.count({ where: { status: 'MAINTENANCE' } }),
      // عدد الكتب المفقودة
      prisma.book.count({ where: { status: 'LOST' } }),
      // مجموع النسخ الكلي
      prisma.book.aggregate({ _sum: { copiesTotal: true } }),
      // مجموع النسخ المتاحة
      prisma.book.aggregate({ _sum: { copiesAvailable: true } })
    ]);

    res.json({
      success: true,
      data: {
        totalBooks,
        availableBooks,
        borrowedBooks,
        maintenanceBooks,
        lostBooks,
        totalCopies: totalCopies._sum.copiesTotal || 0,
        availableCopies: availableCopies._sum.copiesAvailable || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * رفع صورة غلاف الكتاب
 * POST /api/books/:id/cover
 * =========================
 * الصلاحيات: مدير أو موظف فقط
 *
 * @param {string} id - معرف الكتاب
 * @param {File} coverImage - ملف الصورة
 *
 * العملية:
 * 1. التحقق من وجود الكتاب
 * 2. حفظ الصورة
 * 3. تحديث مسار الصورة في قاعدة البيانات
 */
export const uploadBookCover = async (req, res, next) => {
  try {
    const { id } = req.params;

    // التحقق من وجود ملف
    if (!req.file) {
      throw new AppError('لم يتم رفع أي ملف', 'NO_FILE_UPLOADED', 400);
    }

    // التحقق من وجود الكتاب
    const existingBook = await prisma.book.findUnique({
      where: { id }
    });

    if (!existingBook) {
      throw new AppError('الكتاب غير موجود', 'BOOK_NOT_FOUND', 404);
    }

    // إنشاء مسار الصورة
    const coverImagePath = `/uploads/covers/${req.file.filename}`;

    // تحديث الكتاب بمسار الصورة
    const book = await prisma.book.update({
      where: { id },
      data: { coverImage: coverImagePath },
      include: {
        category: true,
        shelf: true
      }
    });

    // تسجيل العملية
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        bookId: book.id,
        action: 'BOOK_COVER_UPLOADED',
        newValue: { coverImage: coverImagePath },
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      data: book,
      message: 'تم رفع صورة الغلاف بنجاح'
    });
  } catch (error) {
    next(error);
  }
};
