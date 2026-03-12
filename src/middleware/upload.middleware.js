/**
 * وسيط رفع الملفات (Upload Middleware)
 * =====================================
 * يُستخدم لرفع صور أغلفة الكتب
 */

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// الحصول على مسار الملف الحالي
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسار مجلد التحميلات
const uploadsDir = path.join(__dirname, '../../uploads/covers');

// إنشاء مجلد التحميلات إذا لم يكن موجوداً
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// إعداد التخزين
const storage = multer.diskStorage({
  // مكان حفظ الملفات
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  // اسم الملف
  filename: (req, file, cb) => {
    // إنشاء اسم فريد: timestamp-random.extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `cover-${uniqueSuffix}${ext}`);
  }
});

// فلتر أنواع الملفات (صور فقط)
const fileFilter = (req, file, cb) => {
  // الأنواع المسموحة
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('نوع الملف غير مسموح. يُسمح فقط بـ: JPEG, PNG, GIF, WebP'), false);
  }
};

// إنشاء وسيط multer
export const uploadCover = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 ميجابايت كحد أقصى
  }
}).single('coverImage'); // حقل واحد باسم coverImage

// وسيط معالجة أخطاء الرفع
export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت'
        }
      });
    }
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message
      }
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message
      }
    });
  }
  next();
};
