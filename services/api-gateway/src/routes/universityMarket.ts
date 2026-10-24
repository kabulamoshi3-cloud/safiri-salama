/**
 * University Marketplace API Routes
 * Enables students and campus vendors to list and sell products:
 * clothes, ornaments, electronics, books, food, handmade items, services, etc.
 * Any university-based business can register and sell to fellow students.
 */

import express, { Request, Response } from 'express';
import { database } from '../database';

export const universityMarketRouter = express.Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type MarketCategory =
  | 'clothes_fashion'
  | 'ornaments_jewellery'
  | 'electronics_gadgets'
  | 'books_notes'
  | 'food_snacks'
  | 'beauty_cosmetics'
  | 'stationery_supplies'
  | 'handmade_crafts'
  | 'services'          // tutoring, printing, design, etc.
  | 'sports_fitness'
  | 'other';

type ListingStatus = 'active' | 'sold' | 'paused' | 'removed';
type DeliveryType = 'pickup_only' | 'campus_delivery' | 'safiriharaka_delivery';

// ─── GET /listings — browse all marketplace listings ─────────────────────────
universityMarketRouter.get('/listings', async (req: Request, res: Response) => {
  try {
    const { category, university, search, min_price, max_price, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const db = await database.getClient();

    let query = `
      SELECT ul.*,
             u.name AS seller_name, u.university AS seller_university,
             u.profile_picture AS seller_avatar
      FROM university_listings ul
      JOIN users u ON u.id = ul.seller_id
      WHERE ul.status = 'active'
    `;
    const params: any[] = [];

    if (category) {
      params.push(category);
      query += ` AND ul.category = $${params.length}`;
    }
    if (university) {
      params.push(`%${university}%`);
      query += ` AND u.university ILIKE $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (ul.title ILIKE $${params.length} OR ul.description ILIKE $${params.length})`;
    }
    if (min_price) {
      params.push(min_price);
      query += ` AND ul.price >= $${params.length}`;
    }
    if (max_price) {
      params.push(max_price);
      query += ` AND ul.price <= $${params.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY ul.is_featured DESC, ul.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await db.query(query, params);
    db.release();

    res.json({ listings: result.rows, page: Number(page) });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch listings', details: err.message });
  }
});

// ─── GET /listings/:id — single listing detail ───────────────────────────────
universityMarketRouter.get('/listings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await database.getClient();

    const result = await db.query(
      `SELECT ul.*,
              u.name AS seller_name, u.phone AS seller_phone,
              u.university AS seller_university, u.profile_picture AS seller_avatar,
              (SELECT COUNT(*) FROM university_orders uo WHERE uo.listing_id = ul.id AND uo.status = 'completed') AS sold_count
       FROM university_listings ul
       JOIN users u ON u.id = ul.seller_id
       WHERE ul.id = $1`,
      [id]
    );

    db.release();

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ listing: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch listing', details: err.message });
  }
});

// ─── POST /listings — create a new listing ───────────────────────────────────
universityMarketRouter.post('/listings', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      title, description, category, price, quantity = 1,
      images = [],
      condition = 'new',             // new | like_new | good | fair
      delivery_type = 'pickup_only',
      pickup_location,
      campus_delivery_fee = 0,
      is_negotiable = false,
      tags = [],
    } = req.body;

    if (!title || !category || price === undefined) {
      return res.status(400).json({ error: 'title, category, and price are required' });
    }
    if (price < 0) {
      return res.status(400).json({ error: 'Price cannot be negative' });
    }

    const db = await database.getClient();

    const result = await db.query(
      `INSERT INTO university_listings
         (seller_id, title, description, category, price, quantity, images,
          condition, delivery_type, pickup_location, campus_delivery_fee,
          is_negotiable, tags, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active')
       RETURNING *`,
      [
        user.id, title, description, category, price, quantity,
        JSON.stringify(images), condition, delivery_type, pickup_location,
        campus_delivery_fee, is_negotiable, JSON.stringify(tags),
      ]
    );

    db.release();

    res.status(201).json({
      message: 'Listing created successfully',
      listing: result.rows[0],
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create listing', details: err.message });
  }
});

// ─── PATCH /listings/:id — update a listing ──────────────────────────────────
universityMarketRouter.patch('/listings/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { title, description, price, quantity, status, is_negotiable } = req.body;

    const db = await database.getClient();

    const result = await db.query(
      `UPDATE university_listings
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           quantity = COALESCE($4, quantity),
           status = COALESCE($5, status),
           is_negotiable = COALESCE($6, is_negotiable),
           updated_at = NOW()
       WHERE id = $7 AND seller_id = $8
       RETURNING *`,
      [title, description, price, quantity, status, is_negotiable, id, user.id]
    );

    db.release();

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Listing not found or not yours' });
    }

    res.json({ message: 'Listing updated', listing: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update listing', details: err.message });
  }
});

// ─── POST /orders — place an order from a listing ────────────────────────────
universityMarketRouter.post('/orders', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { listing_id, quantity = 1, delivery_type, delivery_address, note } = req.body;

    if (!listing_id) {
      return res.status(400).json({ error: 'listing_id is required' });
    }

    const db = await database.getClient();

    const listingResult = await db.query(
      `SELECT ul.*, u.name AS seller_name, u.phone AS seller_phone
       FROM university_listings ul
       JOIN users u ON u.id = ul.seller_id
       WHERE ul.id = $1 AND ul.status = 'active'`,
      [listing_id]
    );

    if (listingResult.rowCount === 0) {
      db.release();
      return res.status(400).json({ error: 'Listing not found or no longer available' });
    }

    const listing = listingResult.rows[0];

    if (listing.seller_id === user.id) {
      db.release();
      return res.status(400).json({ error: 'Cannot order your own listing' });
    }

    if (listing.quantity < quantity) {
      db.release();
      return res.status(400).json({ error: `Only ${listing.quantity} available` });
    }

    const subtotal = listing.price * quantity;
    const deliveryFee = delivery_type === 'campus_delivery' ? listing.campus_delivery_fee : 0;
    const total = subtotal + deliveryFee;

    const orderNumber = `MKT-${Date.now()}-${Math.random().toString(36).substr(2,5).toUpperCase()}`;

    const result = await db.query(
      `INSERT INTO university_orders
         (order_number, buyer_id, seller_id, listing_id, quantity,
          unit_price, delivery_fee, total, delivery_type, delivery_address, note, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')
       RETURNING *`,
      [
        orderNumber, user.id, listing.seller_id, listing_id, quantity,
        listing.price, deliveryFee, total, delivery_type, delivery_address, note,
      ]
    );

    // Reduce stock
    await db.query(
      `UPDATE university_listings SET quantity = quantity - $1 WHERE id = $2`,
      [quantity, listing_id]
    );

    db.release();

    res.status(201).json({
      message: 'Order placed! The seller will contact you to confirm.',
      order: result.rows[0],
      seller_contact: listing.seller_phone,
      summary: {
        order_number: orderNumber,
        item: listing.title,
        quantity,
        subtotal: `Sh${subtotal.toLocaleString()}`,
        delivery_fee: `Sh${deliveryFee.toLocaleString()}`,
        total: `Sh${total.toLocaleString()}`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to place order', details: err.message });
  }
});

// ─── GET /my-listings — seller's own listings ────────────────────────────────
universityMarketRouter.get('/my-listings', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const db = await database.getClient();
    const result = await db.query(
      `SELECT ul.*,
              COUNT(uo.id) AS total_orders,
              SUM(CASE WHEN uo.status='completed' THEN uo.total ELSE 0 END) AS total_earned
       FROM university_listings ul
       LEFT JOIN university_orders uo ON uo.listing_id = ul.id
       WHERE ul.seller_id = $1
       GROUP BY ul.id
       ORDER BY ul.created_at DESC`,
      [user.id]
    );
    db.release();

    res.json({ listings: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch listings', details: err.message });
  }
});

// ─── GET /my-orders — buyer's order history ──────────────────────────────────
universityMarketRouter.get('/my-orders', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const db = await database.getClient();
    const result = await db.query(
      `SELECT uo.*, ul.title, ul.images, ul.category,
              seller.name AS seller_name, seller.phone AS seller_phone
       FROM university_orders uo
       JOIN university_listings ul ON ul.id = uo.listing_id
       JOIN users seller ON seller.id = uo.seller_id
       WHERE uo.buyer_id = $1
       ORDER BY uo.created_at DESC`,
      [user.id]
    );
    db.release();

    res.json({ orders: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
  }
});

// ─── GET /categories — list marketplace categories ───────────────────────────
universityMarketRouter.get('/categories', (_req: Request, res: Response) => {
  res.json({
    categories: [
      { key: 'clothes_fashion',    label: 'Clothes & Fashion',      icon: '👗' },
      { key: 'ornaments_jewellery',label: 'Ornaments & Jewellery',  icon: '💍' },
      { key: 'electronics_gadgets',label: 'Electronics & Gadgets',  icon: '💻' },
      { key: 'books_notes',        label: 'Books & Class Notes',    icon: '📚' },
      { key: 'food_snacks',        label: 'Food & Snacks',          icon: '🍱' },
      { key: 'beauty_cosmetics',   label: 'Beauty & Cosmetics',     icon: '💄' },
      { key: 'stationery_supplies',label: 'Stationery & Supplies',  icon: '✏️' },
      { key: 'handmade_crafts',    label: 'Handmade & Crafts',      icon: '🎨' },
      { key: 'services',           label: 'Services (tutoring, printing, etc.)', icon: '🛠️' },
      { key: 'sports_fitness',     label: 'Sports & Fitness',       icon: '⚽' },
      { key: 'other',              label: 'Other',                  icon: '📦' },
    ],
  });
});

export default universityMarketRouter;
