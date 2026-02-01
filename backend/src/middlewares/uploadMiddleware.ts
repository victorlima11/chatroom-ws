import crypto from 'crypto';
import path from 'path';
import multer from 'multer';
import { ensureUploadsDir, uploadsDir } from '../config/uploads';

ensureUploadsDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, name);
  },
});

export const upload = multer({ storage });
