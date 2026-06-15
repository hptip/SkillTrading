const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

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
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Chỉ cho phép file ảnh.'));
    }

    cb(null, true);
  },
});

router.post('/', authenticate, upload.array('images', 10), (req, res) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];

    if (!files.length) {
      return res.status(400).json({ message: 'Vui lòng chọn ít nhất 1 ảnh.' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const urls = files.map((file) => `${baseUrl}/uploads/${path.basename(file.path)}`);

    return res.json({ urls });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ message: 'Không thể tải ảnh lên. Vui lòng thử lại.' });
  }
});

module.exports = router;
