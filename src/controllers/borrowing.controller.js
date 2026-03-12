/**
 * وحدة التحكم بالاستعارة (Borrowing Controller)
 * ==============================================
 * هذا الملف يحتوي على جميع الدوال المتعلقة بعمليات استعارة وإرجاع الكتب
 *
 * الدوال المتاحة:
 * - borrowBook: استعارة كتاب
 * - returnBook: إرجاع كتاب
 * - getAllBorrowings: جلب جميع عمليات الاستعارة
 * - extendBorrowing: تمديد فترة الاستعارة
 * - getBorrowingStats: إحصائيات الاستعارة
 */

// استيراد Prisma للتعامل مع قاعدة البيانات
import { PrismaClient } from '@prisma/client';

// استيراد فئة الخطأ المخصصة
import { AppError } from '../middleware/error.middleware.js';

// إنشاء اتصال بقاعدة البيانات
const prisma = new PrismaClient();

/**
 * استعارة كتاب
 * POST /api/borrowing/borrow
 * ==========================
 * الصلاحيات: مدير أو موظف فقط
 *
 * البيانات المطلوبة:
 * @param {string} bookId - معرف الكتاب (مطلوب)
 * @param {string} userId - معرف المستخدم (اختياري، افتراضي: المستخدم الحالي)
 * @param {number} borrowDays - عدد أيام الاستعارة (اختياري، افتراضي: 14 يوم)
 * @param {string} notes - ملاحظات (اختياري)
 *
 * الشروط:
 * 1. الكتاب موجود ومتاح
 * 2. المستخدم نشط
 * 3. المستخدم لم يستعر هذا الكتاب مسبقاً
 * 4. المستخدم لم يتجاوز الحد الأقصى (5 كتب)
 *
 * العملية:
 * 1. التحقق من جميع الشروط
 * 2. إنشاء سجل الاستعارة
 * 3. تقليل عدد النسخ المتاحة
 * 4. تسجيل العملية وإرسال إشعار
 */
export const borrowBook = async (req, res, next) => {
  try {
    const { bookId, borrowDays, notes } = req.body;
    let { userId } = req.body;

    // ===== التحقق من المستخدم =====
    // إذا لم يُحدد userId، نستخدم المستخدم الحالي
    // فقط المدير يمكنه استعارة كتب لمستخدمين آخرين
    if (!userId) {
      userId = req.user.id;
    } else if (userId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError('فقط المدير يمكنه استعارة كتب لمستخدمين آخرين', 'FORBIDDEN', 403);
    }

    // ===== التحقق من وجود معرف الكتاب =====
    if (!bookId) {
      throw new AppError('معرف الكتاب مطلوب', 'VALIDATION_ERROR', 400);
    }

    // ===== التحقق من وجود الكتاب وتوفره =====
    const book = await prisma.book.findUnique({
      where: { id: bookId }
    });

    if (!book) {
      throw new AppError('الكتاب غير موجود', 'BOOK_NOT_FOUND', 404);
    }

    // التحقق من وجود نسخ متاحة
    if (book.copiesAvailable <= 0) {
      throw new AppError('لا توجد نسخ متاحة للاستعارة', 'NO_COPIES_AVAILABLE', 400);
    }

    // ===== التحقق من وجود المستخدم وحالته =====
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('المستخدم غير موجود', 'USER_NOT_FOUND', 404);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError('حساب المستخدم غير نشط', 'INACTIVE_USER', 403);
    }

    // ===== التحقق من عدم استعارة نفس الكتاب =====
    const existingBorrowing = await prisma.borrowing.findFirst({
      where: {
        userId,
        bookId,
        status: 'BORROWED' // استعارة نشطة
      }
    });

    if (existingBorrowing) {
      throw new AppError('المستخدم لديه هذا الكتاب مُستعار بالفعل', 'ALREADY_BORROWED', 400);
    }

    // ===== التحقق من الحد الأقصى للاستعارة =====
    const activeBorrowings = await prisma.borrowing.count({
      where: {
        userId,
        status: 'BORROWED'
      }
    });

    // الحد الأقصى: 5 كتب (أو حسب إعدادات البيئة)
    const MAX_BOOKS_PER_USER = parseInt(process.env.MAX_BOOKS_PER_USER) || 5;
    if (activeBorrowings >= MAX_BOOKS_PER_USER) {
      throw new AppError(
        `المستخدم وصل للحد الأقصى من الاستعارات (${MAX_BOOKS_PER_USER} كتب)`,
        'BORROWING_LIMIT_REACHED',
        400
      );
    }

    // ===== حساب تاريخ الإرجاع المتوقع =====
    // الافتراضي: 14 يوم
    const days = borrowDays || parseInt(process.env.MAX_BORROW_DAYS) || 14;
    const expectedReturnDate = new Date();
    expectedReturnDate.setDate(expectedReturnDate.getDate() + days);

    // ===== إنشاء سجل الاستعارة =====
    const borrowing = await prisma.borrowing.create({
      data: {
        userId,
        bookId,
        borrowDate: new Date(), // تاريخ الاستعارة: الآن
        expectedReturnDate, // تاريخ الإرجاع المتوقع
        status: 'BORROWED', // الحالة: مُستعار
        notes
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        book: {
          include: {
            category: true,
            shelf: true
          }
        }
      }
    });

    // ===== تحديث عدد النسخ المتاحة =====
    // نُنقص نسخة واحدة
    await prisma.book.update({
      where: { id: bookId },
      data: {
        copiesAvailable: {
          decrement: 1 // إنقاص 1
        }
      }
    });

    // ===== تسجيل العملية =====
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        bookId,
        action: 'BOOK_BORROWED',
        newValue: {
          borrower: user.fullName,
          borrowerId: userId,
          borrowDate: borrowing.borrowDate,
          expectedReturn: expectedReturnDate
        },
        ipAddress: req.ip
      }
    });

    // ===== إرسال إشعار للمستخدم =====
    await prisma.notification.create({
      data: {
        userId,
        type: 'INFO',
        title: 'تمت استعارة الكتاب بنجاح',
        message: `لقد استعرت "${book.title}". يرجى إرجاعه قبل ${expectedReturnDate.toLocaleDateString('ar-EG')}.`,
        isRead: false
      }
    });

    res.status(201).json({
      success: true,
      data: borrowing,
      message: 'تمت استعارة الكتاب بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * إرجاع كتاب
 * POST /api/borrowing/return/:borrowingId
 * ========================================
 * الصلاحيات: مدير أو موظف فقط
 *
 * @param {string} borrowingId - معرف عملية الاستعارة
 * @param {string} notes - ملاحظات (اختياري)
 *
 * العملية:
 * 1. التحقق من وجود سجل الاستعارة
 * 2. التحقق من أن الكتاب لم يُرجع مسبقاً
 * 3. تحديث سجل الاستعارة
 * 4. زيادة عدد النسخ المتاحة
 * 5. تسجيل العملية وإرسال إشعار
 */
export const returnBook = async (req, res, next) => {
  try {
    const { borrowingId } = req.params;
    const { notes } = req.body;

    // ===== جلب سجل الاستعارة =====
    const borrowing = await prisma.borrowing.findUnique({
      where: { id: borrowingId },
      include: {
        book: true,
        user: true
      }
    });

    if (!borrowing) {
      throw new AppError('سجل الاستعارة غير موجود', 'BORROWING_NOT_FOUND', 404);
    }

    // ===== التحقق من حالة الاستعارة =====
    if (borrowing.status === 'RETURNED') {
      throw new AppError('الكتاب تم إرجاعه مسبقاً', 'ALREADY_RETURNED', 400);
    }

    // ===== تحديث سجل الاستعارة =====
    const updatedBorrowing = await prisma.borrowing.update({
      where: { id: borrowingId },
      data: {
        status: 'RETURNED', // تغيير الحالة
        actualReturnDate: new Date(), // تاريخ الإرجاع الفعلي
        notes: notes || borrowing.notes
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        book: {
          include: {
            category: true,
            shelf: true
          }
        }
      }
    });

    // ===== زيادة عدد النسخ المتاحة =====
    await prisma.book.update({
      where: { id: borrowing.bookId },
      data: {
        copiesAvailable: {
          increment: 1 // زيادة 1
        }
      }
    });

    // ===== تسجيل العملية =====
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        bookId: borrowing.bookId,
        action: 'BOOK_RETURNED',
        oldValue: {
          status: 'BORROWED',
          borrowDate: borrowing.borrowDate
        },
        newValue: {
          status: 'RETURNED',
          returnDate: updatedBorrowing.actualReturnDate
        },
        ipAddress: req.ip
      }
    });

    // ===== إرسال إشعار للمستخدم =====
    // نتحقق إذا كان الكتاب متأخراً
    const isOverdue = new Date() > new Date(borrowing.expectedReturnDate);
    await prisma.notification.create({
      data: {
        userId: borrowing.userId,
        type: isOverdue ? 'REMINDER' : 'INFO',
        title: 'تم إرجاع الكتاب',
        message: `شكراً لإرجاع "${borrowing.book.title}"${isOverdue ? ' (كان متأخراً)' : ''}.`,
        isRead: false
      }
    });

    res.json({
      success: true,
      data: updatedBorrowing,
      message: 'تم إرجاع الكتاب بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * جلب جميع عمليات الاستعارة
 * GET /api/borrowing
 * ===================
 *
 * معاملات الاستعلام:
 * @param {number} page - رقم الصفحة
 * @param {number} limit - عدد النتائج
 * @param {string} status - تصفية حسب الحالة (BORROWED/RETURNED/OVERDUE)
 * @param {string} userId - تصفية حسب المستخدم
 * @param {string} bookId - تصفية حسب الكتاب
 */
export const getAllBorrowings = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      userId,
      bookId
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // بناء شروط الفلترة
    const where = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (bookId) where.bookId = bookId;

    // جلب البيانات مع العد
    const [borrowings, total] = await Promise.all([
      prisma.borrowing.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true
            }
          },
          book: {
            include: {
              category: true,
              shelf: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { borrowDate: 'desc' } // الأحدث أولاً
      }),
      prisma.borrowing.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        borrowings,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * تمديد فترة الاستعارة
 * PUT /api/borrowing/:borrowingId/extend
 * ======================================
 * الصلاحيات: مدير أو موظف فقط
 *
 * @param {string} borrowingId - معرف عملية الاستعارة
 * @param {number} additionalDays - عدد الأيام الإضافية (الحد الأدنى: 1)
 *
 * يُستخدم عندما يحتاج المستخدم وقتاً إضافياً للكتاب
 */
export const extendBorrowing = async (req, res, next) => {
  try {
    const { borrowingId } = req.params;
    const { additionalDays } = req.body;

    // التحقق من المدخلات
    if (!additionalDays || additionalDays < 1) {
      throw new AppError('عدد الأيام الإضافية يجب أن يكون 1 على الأقل', 'VALIDATION_ERROR', 400);
    }

    // جلب سجل الاستعارة
    const borrowing = await prisma.borrowing.findUnique({
      where: { id: borrowingId },
      include: { book: true, user: true }
    });

    if (!borrowing) {
      throw new AppError('سجل الاستعارة غير موجود', 'BORROWING_NOT_FOUND', 404);
    }

    // التحقق من أن الاستعارة نشطة
    if (borrowing.status !== 'BORROWED') {
      throw new AppError('يمكن تمديد الاستعارات النشطة فقط', 'INVALID_STATUS', 400);
    }

    // حساب تاريخ الإرجاع الجديد
    const newExpectedReturn = new Date(borrowing.expectedReturnDate);
    newExpectedReturn.setDate(newExpectedReturn.getDate() + parseInt(additionalDays));

    // تحديث سجل الاستعارة
    const updatedBorrowing = await prisma.borrowing.update({
      where: { id: borrowingId },
      data: { expectedReturnDate: newExpectedReturn },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        book: true
      }
    });

    // تسجيل العملية
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        bookId: borrowing.bookId,
        action: 'BORROWING_EXTENDED',
        oldValue: { expectedReturnDate: borrowing.expectedReturnDate },
        newValue: { expectedReturnDate: newExpectedReturn },
        ipAddress: req.ip
      }
    });

    res.json({
      success: true,
      data: updatedBorrowing,
      message: 'تم تمديد فترة الاستعارة بنجاح'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * إحصائيات الاستعارة
 * GET /api/borrowing/stats
 * ========================
 *
 * يُرجع:
 * - totalBorrowings: إجمالي عمليات الاستعارة
 * - activeBorrowings: الاستعارات النشطة
 * - returnedBorrowings: الكتب المُرجعة
 * - overdueBorrowings: الكتب المتأخرة
 */
export const getBorrowingStats = async (req, res, next) => {
  try {
    const [
      totalBorrowings,
      activeBorrowings,
      returnedBorrowings,
      overdueBorrowings
    ] = await Promise.all([
      // إجمالي الاستعارات
      prisma.borrowing.count(),
      // الاستعارات النشطة
      prisma.borrowing.count({ where: { status: 'BORROWED' } }),
      // الكتب المُرجعة
      prisma.borrowing.count({ where: { status: 'RETURNED' } }),
      // الكتب المتأخرة (مُستعارة وتجاوزت موعد الإرجاع)
      prisma.borrowing.count({
        where: {
          status: 'BORROWED',
          expectedReturnDate: { lt: new Date() }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalBorrowings,
        activeBorrowings,
        returnedBorrowings,
        overdueBorrowings
      }
    });
  } catch (error) {
    next(error);
  }
};
