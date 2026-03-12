/**
 * خدمة فحص التأخير (Overdue Checker Service)
 * ============================================
 * هذه الخدمة تعمل في الخلفية وتفحص الكتب المتأخرة بشكل دوري
 *
 * ما هو الكتاب المتأخر؟
 * - كتاب مُستعار وتجاوز تاريخ الإرجاع المتوقع
 * - مثال: إذا كان موعد الإرجاع 1 يناير والآن 5 يناير = متأخر 4 أيام
 *
 * ماذا تفعل هذه الخدمة؟
 * 1. تبحث عن جميع الكتب المتأخرة
 * 2. تُحدّث حالتها إلى "متأخر" (OVERDUE)
 * 3. تُرسل إشعارات للمستخدمين
 *
 * متى تعمل؟
 * - تعمل فور بدء السيرفر
 * - ثم تتكرر كل 24 ساعة
 */

// استيراد Prisma للتعامل مع قاعدة البيانات
import { PrismaClient } from '@prisma/client';

// إنشاء اتصال بقاعدة البيانات
const prisma = new PrismaClient();

/**
 * فحص الكتب المتأخرة
 * ==================
 * تبحث عن جميع الاستعارات المتأخرة وتُعالجها
 *
 * خطوات العمل:
 * 1. البحث عن الاستعارات النشطة التي تجاوزت موعد الإرجاع
 * 2. تحديث حالة كل استعارة إلى "متأخر"
 * 3. إرسال إشعار للمستخدم (مرة واحدة في اليوم)
 */
export const checkOverdueBooks = async () => {
  try {
    // ===== البحث عن الاستعارات المتأخرة =====
    const overdueBorrowings = await prisma.borrowing.findMany({
      where: {
        status: 'BORROWED', // حالة مُستعار
        expectedReturnDate: {
          lt: new Date() // تاريخ الإرجاع أقل من (قبل) التاريخ الحالي
        }
      },
      include: {
        user: true, // بيانات المستخدم
        book: true // بيانات الكتاب
      }
    });

    // ===== معالجة كل استعارة متأخرة =====
    for (const borrowing of overdueBorrowings) {
      // تحديث الحالة إلى "متأخر"
      await prisma.borrowing.update({
        where: { id: borrowing.id },
        data: { status: 'OVERDUE' }
      });

      // ===== إرسال إشعار (مرة واحدة في اليوم) =====
      // نتحقق إذا أُرسل إشعار اليوم لنفس الكتاب
      const today = new Date();
      today.setHours(0, 0, 0, 0); // بداية اليوم

      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: borrowing.userId,
          type: 'OVERDUE',
          createdAt: {
            gte: today // اليوم أو بعده
          },
          message: {
            contains: borrowing.book.title // يحتوي على اسم الكتاب
          }
        }
      });

      // إذا لم يُرسل إشعار اليوم، نُرسل واحداً
      if (!existingNotification) {
        // حساب عدد أيام التأخير
        const daysOverdue = Math.floor(
          (new Date() - new Date(borrowing.expectedReturnDate)) / (1000 * 60 * 60 * 24)
        );

        // إنشاء الإشعار
        await prisma.notification.create({
          data: {
            userId: borrowing.userId,
            type: 'OVERDUE',
            title: 'كتاب متأخر',
            message: `كتابك "${borrowing.book.title}" متأخر بـ ${daysOverdue} يوم. يرجى إرجاعه في أقرب وقت.`,
            isRead: false
          }
        });

        console.log(`تم إرسال إشعار تأخير إلى ${borrowing.user.email} للكتاب "${borrowing.book.title}"`);
      }
    }

    console.log(`اكتمل فحص التأخير. وُجد ${overdueBorrowings.length} كتاب متأخر.`);
  } catch (error) {
    console.error('خطأ في فحص الكتب المتأخرة:', error);
  }
};

/**
 * بدء خدمة فحص التأخير
 * =====================
 * تبدأ الخدمة وتُجدول الفحص الدوري
 *
 * الجدولة:
 * - تعمل فوراً عند بدء السيرفر
 * - تتكرر كل 24 ساعة (أو حسب إعدادات البيئة)
 *
 * متغير البيئة:
 * OVERDUE_CHECK_INTERVAL: الفترة بالملي ثانية (افتراضي: 86400000 = 24 ساعة)
 */
export const startOverdueChecker = () => {
  // تشغيل الفحص فوراً
  checkOverdueBooks();

  // جدولة الفحص الدوري
  // 86400000 ملي ثانية = 24 ساعة
  const interval = parseInt(process.env.OVERDUE_CHECK_INTERVAL) || 86400000;
  setInterval(checkOverdueBooks, interval);

  console.log('تم بدء خدمة فحص التأخير');
};
