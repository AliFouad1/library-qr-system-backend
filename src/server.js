/**
 * الملف الرئيسي للسيرفر (Main Server File)
 * =========================================
 * نظام إدارة المكتبة الذكي باستخدام رموز QR
 *
 * ما هو هذا الملف؟
 * - نقطة البداية للتطبيق الخلفي (Backend)
 * - يُهيئ السيرفر ويربط جميع الأجزاء ببعضها
 * - يستقبل الطلبات ويوجهها للمسارات المناسبة
 *
 * المكونات الرئيسية:
 * 1. Express: إطار العمل للسيرفر
 * 2. CORS: السماح بالطلبات من الواجهة الأمامية
 * 3. Routes: مسارات API
 * 4. Middleware: الوسطاء (المصادقة، الأخطاء)
 * 5. Services: الخدمات (فحص التأخير)
 */

// ==================== استيراد المكتبات ====================

// Express: إطار عمل الويب الأساسي
import express from 'express';

// CORS: للسماح بالطلبات من نطاقات مختلفة (الواجهة الأمامية)
import cors from 'cors';

// dotenv: لقراءة متغيرات البيئة من ملف .env
import dotenv from 'dotenv';

// path: للتعامل مع مسارات الملفات
import path from 'path';
import { fileURLToPath } from 'url';

// الحصول على مسار الملف الحالي
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسار مجلد الصور
const uploadsPath = path.join(__dirname, '../uploads');

// ==================== استيراد المسارات ====================

// مسارات المصادقة (تسجيل الدخول)
import authRoutes from './routes/auth.routes.js';

// مسارات المستخدمين
import userRoutes from './routes/user.routes.js';

// مسارات الكتب
import bookRoutes from './routes/book.routes.js';

// مسارات التصنيفات
import categoryRoutes from './routes/category.routes.js';

// مسارات الرفوف
import shelfRoutes from './routes/shelf.routes.js';

// مسارات الاستعارة
import borrowingRoutes from './routes/borrowing.routes.js';

// مسارات رمز QR
import qrRoutes from './routes/qr.routes.js';

// مسارات التقارير
import reportRoutes from './routes/report.routes.js';

// ==================== استيراد الوسطاء والخدمات ====================

// وسيط معالجة الأخطاء
import { errorHandler } from './middleware/error.middleware.js';

// خدمة فحص الكتب المتأخرة
import { startOverdueChecker } from './services/overdue.service.js';

// ==================== إعداد التطبيق ====================

// تحميل متغيرات البيئة من ملف .env
dotenv.config();

// إنشاء تطبيق Express
const app = express();

// رقم المنفذ (من متغيرات البيئة أو 5000 افتراضياً)
const PORT = process.env.PORT || 5000;

// ==================== الوسطاء العامة (Middleware) ====================

/**
 * إعداد CORS
 * ----------
 * CORS = Cross-Origin Resource Sharing
 * يسمح للواجهة الأمامية (Frontend) بالتواصل مع السيرفر
 *
 * origin: عنوان الواجهة الأمامية المسموح به
 * credentials: السماح بإرسال الكوكيز
 */
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
    'http://localhost:5174',
    'http://localhost:4173'  // Vite preview
  ],
  credentials: true
}));

/**
 * تحليل JSON
 * ----------
 * يحول بيانات JSON في الطلبات إلى كائنات JavaScript
 * limit: الحد الأقصى لحجم البيانات (10 ميجابايت)
 */
app.use(express.json({ limit: '10mb' }));

/**
 * تحليل البيانات المُشفرة في URL
 * -----------------------------
 * لمعالجة بيانات النماذج (forms)
 */
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * خدمة الملفات الثابتة (الصور)
 * ---------------------------
 * يتيح الوصول للصور المرفوعة عبر /uploads/*
 */
app.use('/uploads', express.static(uploadsPath));

/**
 * وسيط تسجيل الطلبات
 * ------------------
 * يطبع كل طلب يصل للسيرفر (للتتبع والتصحيح)
 * مثال: [2024-01-15T10:30:00] GET /api/books
 */
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ==================== نقطة فحص الصحة ====================

/**
 * نقطة فحص صحة السيرفر
 * GET /health
 * -----------
 * تُستخدم للتحقق من أن السيرفر يعمل
 * مفيدة لأدوات المراقبة والنشر
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'نظام إدارة المكتبة يعمل بنجاح',
    timestamp: new Date().toISOString()
  });
});

// ==================== تسجيل مسارات API ====================

/**
 * ربط المسارات بالتطبيق
 * كل مسار يبدأ بـ /api/ ثم اسم المورد
 *
 * مثال: طلب GET /api/books سيُعالج بواسطة bookRoutes
 */

// مسارات المصادقة: /api/auth/*
app.use('/api/auth', authRoutes);

// مسارات المستخدمين: /api/users/*
app.use('/api/users', userRoutes);

// مسارات الكتب: /api/books/*
app.use('/api/books', bookRoutes);

// مسارات التصنيفات: /api/categories/*
app.use('/api/categories', categoryRoutes);

// مسارات الرفوف: /api/shelves/*
app.use('/api/shelves', shelfRoutes);

// مسارات الاستعارة: /api/borrowing/*
app.use('/api/borrowing', borrowingRoutes);

// مسارات رمز QR: /api/qr/*
app.use('/api/qr', qrRoutes);

// مسارات التقارير: /api/reports/*
app.use('/api/reports', reportRoutes);

// ==================== معالجة الأخطاء ====================

/**
 * معالج المسارات غير الموجودة (404)
 * ---------------------------------
 * إذا وصل طلب لمسار غير موجود، نُرجع خطأ 404
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'المسار غير موجود'
    }
  });
});

/**
 * معالج الأخطاء العام
 * ------------------
 * يستقبل جميع الأخطاء ويُرسل استجابة مناسبة
 */
app.use(errorHandler);

// ==================== بدء السيرفر ====================

/**
 * بدء الاستماع على المنفذ المحدد
 */
app.listen(PORT, () => {
  // طباعة رسالة الترحيب
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   نظام إدارة المكتبة الذكي باستخدام رموز QR               ║
║   السيرفر الخلفي يعمل                                      ║
╠════════════════════════════════════════════════════════════╣
║   المنفذ: ${PORT}                                              ║
║   البيئة: ${process.env.NODE_ENV || 'development'}                               ║
║   الوقت: ${new Date().toLocaleString('ar-EG')}              ║
╚════════════════════════════════════════════════════════════╝
  `);

  // بدء الخدمات في الخلفية
  startOverdueChecker();
  console.log('✓ تم بدء خدمة فحص الكتب المتأخرة');
});

// ==================== معالجة الأخطاء غير المُلتقطة ====================

/**
 * معالجة Promise Rejections غير المُعالجة
 * ----------------------------------------
 * إذا حدث خطأ في Promise ولم يُعالج، نوقف السيرفر
 * هذا يمنع السيرفر من الاستمرار في حالة غير مستقرة
 */
process.on('unhandledRejection', (err) => {
  console.error('خطأ غير مُعالج:', err);
  process.exit(1);
});

// تصدير التطبيق (للاختبارات)
export default app;
