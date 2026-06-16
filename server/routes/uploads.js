const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const supabaseClient = require('../lib/supabaseClient');

const router = express.Router();

// Local fallback directory
const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9.-]/g, '');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Chỉ cho phép file ảnh.'));
    }

    cb(null, true);
  },
});

async function uploadToSupabase(filePath, destName) {
  if (!supabaseClient) return null;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'public';
  const storage = supabaseClient.storage.from(bucket);
  const fileData = fs.createReadStream(filePath);
  const isPrivateBucket = process.env.SUPABASE_STORAGE_PRIVATE === 'true';

  const { data, error } = await storage.upload(destName, fileData, { cacheControl: '3600', upsert: false });
  if (error) {
    console.error('Supabase upload error', error);
    return null;
  }

  if (isPrivateBucket) {
    const { data: signedData, error: signedError } = await storage.createSignedUrl(data.path, 60 * 60);
    if (signedError) {
      console.error('Supabase signed URL error', signedError);
      return null;
    }
    return signedData.signedUrl;
  }

  const publicUrl = storage.getPublicUrl(data.path).data.publicUrl;
  return publicUrl;
}

// Accepts multipart/form-data with field name 'images'
router.post('/', authenticate, upload.array('images', 10), async (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];

    if (!files.length) {
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 ảnh.' });
    }

    const uploadedUrls = [];
    for (const file of files) {
      let publicUrl = null;
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
        const destName = `uploads/${Date.now()}-${file.filename}`;
        publicUrl = await uploadToSupabase(file.path, destName);
      }

      if (!publicUrl) {
        // fallback to local static url
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        publicUrl = `${baseUrl}/uploads/${path.basename(file.path)}`;
      }

      uploadedUrls.push(publicUrl);
    }

    return res.json({ urls: uploadedUrls });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ message: 'Không thể tải ảnh lên. Vui lòng thử lại.' });
  }
});

module.exports = router;
