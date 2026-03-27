/**
 * وسيط رفع الملفات (Upload Middleware)
 * =====================================
 * يُستخدم لرفع صور أغلفة الكتب إلى Supabase Storage
 */

import multer from 'multer';

// استخدام الذاكرة المؤقتة بدلاً من القرص الصلب
const storage = multer.memoryStorage();

// فلتر أنواع الملفات (صور فقط)
const fileFilter = (req, file, cb) => {
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
