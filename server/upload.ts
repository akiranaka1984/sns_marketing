/**
 * File Upload API
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { storagePut } from './storage';
import { randomBytes } from 'crypto';
import { sdk } from './_core/sdk';

import { createLogger } from "./utils/logger";

const logger = createLogger("upload");

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  },
});

/**
 * Authentication middleware for upload endpoint.
 * Validates the session cookie before allowing file uploads.
 */
async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await sdk.authenticateRequest(req);
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required' });
  }
}

/**
 * POST /api/upload
 * Upload a file to S3 storage (authentication required)
 */
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Generate unique filename
    const randomSuffix = randomBytes(8).toString('hex');
    const ext = req.file.originalname.split('.').pop();
    const filename = `uploads/${Date.now()}-${randomSuffix}.${ext}`;

    // Upload to S3
    const { url } = await storagePut(
      filename,
      req.file.buffer,
      req.file.mimetype
    );

    res.json({ url });
  } catch (error) {
    logger.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;
