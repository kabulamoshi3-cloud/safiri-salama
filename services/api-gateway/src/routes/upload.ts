/**
 * File Upload Routes
 * Profile photos + driver documents
 * Uses Cloudinary free tier (25GB storage, 25K transforms/month)
 * 
 * Cloudinary unsigned upload — no server-side SDK needed
 * The app uploads directly to Cloudinary, then sends the URL to our API
 */

import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

const router = Router();

// Cloudinary config (unsigned upload preset)
// Users will need to create a free Cloudinary account and set these
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'skyrex';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'skyrex_unsigned';

/**
 * GET /api/v1/upload/config
 * Returns Cloudinary config for client-side upload
 */
router.get('/config', async (req: Request, res: Response) => {
  res.json({
    cloudName: CLOUDINARY_CLOUD_NAME,
    uploadPreset: CLOUDINARY_UPLOAD_PRESET,
    uploadUrl: `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
  });
});

/**
 * POST /api/v1/upload/avatar
 * Save the uploaded avatar URL to user profile
 */
router.post('/avatar', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { imageUrl } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl required' });

    // Validate URL format
    if (!imageUrl.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }

    await pool.query(
      'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
      [imageUrl, userId]
    );

    res.json({ message: 'Avatar updated', avatarUrl: imageUrl });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

/**
 * GET /api/v1/upload/avatar
 * Get current user's avatar URL
 */
router.get('/avatar', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
    res.json({ avatarUrl: result.rows[0]?.avatar_url || null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get avatar' });
  }
});

/**
 * POST /api/v1/upload/document
 * Driver uploads verification document (license, insurance, etc.)
 */
router.post('/document', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { documentType, imageUrl, documentNumber, expiryDate } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!documentType || !imageUrl) {
      return res.status(400).json({ error: 'documentType and imageUrl required' });
    }

    const validTypes = ['drivers_license', 'vehicle_insurance', 'vehicle_registration', 'national_id', 'selfie'];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({ error: `Invalid document type. Must be one of: ${validTypes.join(', ')}` });
    }

    // Insert document record
    const result = await pool.query(
      `INSERT INTO driver_documents (user_id, document_type, image_url, document_number, expiry_date, status, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING id, document_type, status`,
      [userId, documentType, imageUrl, documentNumber || null, expiryDate || null]
    );

    res.status(201).json({
      message: 'Document uploaded for verification',
      document: result.rows[0],
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

/**
 * GET /api/v1/upload/documents
 * Get all documents for current user (driver)
 */
router.get('/documents', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT id, document_type, image_url, document_number, expiry_date, status, uploaded_at, reviewed_at, rejection_reason
       FROM driver_documents WHERE user_id = $1 ORDER BY uploaded_at DESC`,
      [userId]
    );

    res.json({ documents: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

/**
 * PATCH /api/v1/upload/documents/:docId/review
 * Admin reviews a document (approve/reject)
 */
router.patch('/documents/:docId/review', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { docId } = req.params;
    const { status, rejectionReason } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }

    const result = await pool.query(
      `UPDATE driver_documents 
       SET status = $1, rejection_reason = $2, reviewed_at = NOW(), reviewed_by = $3
       WHERE id = $4 RETURNING *`,
      [status, rejectionReason || null, userId, docId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // If all documents approved, update driver verification status
    if (status === 'approved') {
      const docOwner = result.rows[0].user_id;
      const allDocs = await pool.query(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
         FROM driver_documents WHERE user_id = $1`,
        [docOwner]
      );

      const { total, approved } = allDocs.rows[0];
      if (parseInt(approved) >= 3) { // At least 3 docs approved = verified
        await pool.query(
          `UPDATE drivers SET verification_status = 'verified' WHERE user_id = $1`,
          [docOwner]
        );
      }
    }

    res.json({ message: `Document ${status}`, document: result.rows[0] });
  } catch (error) {
    console.error('Review document error:', error);
    res.status(500).json({ error: 'Failed to review document' });
  }
});

export default router;
