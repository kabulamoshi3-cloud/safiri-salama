/**
 * Shop & Grocery Delivery API Routes
 * Covers stationary, grocery, parcel, and university marketplace businesses
 * (clothes, ornaments, electronics, books, and any campus vendor)
 */

import express, { Request, Response } from 'express';
import { database } from '../database';

export const shopDeliveryRouter = express.Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type ShopCategory =
  | 'grocery'
  | 'stationary'
  | 'parcel'
  | 'clothes'
  | 'ornaments'
  | 'electronics'
  | 'books'
  | 'pharmacy'
  | 'university_vendor'
  | 'other';

interface Shop {
  id: string;
  name: string;
  description: string;
  category: ShopCategory;
  address: string;
  latitude: number;
  longitude: number;
  logo_url: string;
  rating: number;
  delivery_fee: number;
  min_order_amount: number;
  delivery_time_min: number;
  delivery_time_max: number;
  is_open: boolean;
  is_university_vendor: boolean;
  university_name?: string;
  owner_id: string;
}

interface ShopProduct {
  id: string;
  shop_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock_quantity: number;
  available: boolean;
  weight_kg?: number;
}

interface ShopOrder {
  id: string;
  order_number: string;
  user_id: string;
  shop_id: string;
  driver_id?: string;
  items: { product_id: string; quantity: number; unit_price: number }[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_address: string;
  delivery_lat: number;
  delivery_lng: number;
  status: 'pending' | 'confirmed' | 'picking' | 'in_transit' | 'delivered' | 'cancelled';
  notes?: string;
  created_at: string;
  estimated_delivery_at?: string;
}

// ─── GET /shops — list all shops, optionally filtered by category ─────────────
shopDeliveryRouter.get('/shops', async (req: Request, res: Response) => {
  try {
    const { category, lat, lng, radius_km = 10, university_only } = req.query;

    const db = await database.getClient();

    let query = `
      SELECT s.*,
             COUNT(so.id) AS total_orders,
             COALESCE(AVG(sr.rating), 0) AS avg_rating
      FROM shops s
      LEFT JOIN shop_orders so ON so.shop_id = s.id AND so.status = 'delivered'
      LEFT JOIN shop_ratings sr ON sr.shop_id = s.id
      WHERE s.is_active = true
    `;
    const params: any[] = [];

    if (category) {
      params.push(category);
      query += ` AND s.category = $${params.length}`;
    }

    if (university_only === 'true') {
      query += ` AND s.is_university_vendor = true`;
    }

    if (lat && lng) {
      params.push(lat, lng, radius_km);
      query += ` AND (
        6371 * acos(
          cos(radians($${params.length - 2})) * cos(radians(s.latitude)) *
          cos(radians(s.longitude) - radians($${params.length - 1})) +
          sin(radians($${params.length - 2})) * sin(radians(s.latitude))
        )
      ) <= $${params.length}`;
    }

    query += ` GROUP BY s.id ORDER BY avg_rating DESC, s.created_at DESC`;

    const result = await db.query(query, params);
    db.release();

    res.json({ shops: result.rows, total: result.rowCount });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch shops', details: err.message });
  }
});

// ─── GET /shops/:shopId — single shop details ─────────────────────────────────
shopDeliveryRouter.get('/shops/:shopId', async (req: Request, res: Response) => {
  try {
    const { shopId } = req.params;
    const db = await database.getClient();

    const shopResult = await db.query(
      `SELECT s.*, COALESCE(AVG(sr.rating), 0) AS avg_rating, COUNT(sr.id) AS review_count
       FROM shops s
       LEFT JOIN shop_ratings sr ON sr.shop_id = s.id
       WHERE s.id = $1 AND s.is_active = true
       GROUP BY s.id`,
      [shopId]
    );

    if (shopResult.rowCount === 0) {
      db.release();
      return res.status(404).json({ error: 'Shop not found' });
    }

    const productsResult = await db.query(
      `SELECT * FROM shop_products WHERE shop_id = $1 AND available = true ORDER BY category, name`,
      [shopId]
    );

    db.release();

    res.json({
      shop: shopResult.rows[0],
      products: productsResult.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch shop', details: err.message });
  }
});

// ─── GET /shops/:shopId/products — list products ─────────────────────────────
shopDeliveryRouter.get('/shops/:shopId/products', async (req: Request, res: Response) => {
  try {
    const { shopId } = req.params;
    const { category } = req.query;
    const db = await database.getClient();

    let query = `SELECT * FROM shop_products WHERE shop_id = $1 AND available = true`;
    const params: any[] = [shopId];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    query += ` ORDER BY category, name`;

    const result = await db.query(query, params);
    db.release();

    res.json({ products: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

// ─── POST /orders — place a shop order ────────────────────────────────────────
shopDeliveryRouter.post('/orders', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      shop_id,
      items,           // [{ product_id, quantity }]
      delivery_address,
      delivery_lat,
      delivery_lng,
      notes,
      payment_method = 'wallet',
    } = req.body;

    if (!shop_id || !items?.length || !delivery_address) {
      return res.status(400).json({ error: 'shop_id, items, and delivery_address are required' });
    }

    const db = await database.getClient();

    // Validate shop exists and is open
    const shopResult = await db.query(
      `SELECT * FROM shops WHERE id = $1 AND is_active = true AND is_open = true`,
      [shop_id]
    );

    if (shopResult.rowCount === 0) {
      db.release();
      return res.status(400).json({ error: 'Shop not found or currently closed' });
    }

    const shop: Shop = shopResult.rows[0];

    // Validate products and calculate subtotal
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const productResult = await db.query(
        `SELECT * FROM shop_products WHERE id = $1 AND shop_id = $2 AND available = true`,
        [item.product_id, shop_id]
      );

      if (productResult.rowCount === 0) {
        db.release();
        return res.status(400).json({ error: `Product ${item.product_id} not available` });
      }

      const product: ShopProduct = productResult.rows[0];

      if (product.stock_quantity < item.quantity) {
        db.release();
        return res.status(400).json({
          error: `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}`,
        });
      }

      subtotal += product.price * item.quantity;
      orderItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price,
        product_name: product.name,
      });
    }

    if (subtotal < shop.min_order_amount) {
      db.release();
      return res.status(400).json({
        error: `Minimum order is Sh${shop.min_order_amount}. Your subtotal is Sh${subtotal}`,
      });
    }

    const total = subtotal + shop.delivery_fee;
    const orderNumber = `SHP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create the order
    const orderResult = await db.query(
      `INSERT INTO shop_orders
         (order_number, user_id, shop_id, items, subtotal, delivery_fee, total,
          delivery_address, delivery_lat, delivery_lng, notes, payment_method, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending')
       RETURNING *`,
      [
        orderNumber, user.id, shop_id, JSON.stringify(orderItems),
        subtotal, shop.delivery_fee, total,
        delivery_address, delivery_lat, delivery_lng, notes, payment_method,
      ]
    );

    // Deduct stock
    for (const item of items) {
      await db.query(
        `UPDATE shop_products SET stock_quantity = stock_quantity - $1 WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    }

    db.release();

    res.status(201).json({
      message: 'Order placed successfully',
      order: orderResult.rows[0],
      summary: {
        order_number: orderNumber,
        subtotal: `Sh${subtotal.toLocaleString()}`,
        delivery_fee: `Sh${shop.delivery_fee.toLocaleString()}`,
        total: `Sh${total.toLocaleString()}`,
        estimated_delivery: `${shop.delivery_time_min}–${shop.delivery_time_max} minutes`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to place order', details: err.message });
  }
});

// ─── GET /orders — user's order history ───────────────────────────────────────
shopDeliveryRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const db = await database.getClient();
    const result = await db.query(
      `SELECT so.*, s.name AS shop_name, s.logo_url AS shop_logo, s.category AS shop_category
       FROM shop_orders so
       JOIN shops s ON s.id = so.shop_id
       WHERE so.user_id = $1
       ORDER BY so.created_at DESC
       LIMIT 50`,
      [user.id]
    );
    db.release();

    res.json({ orders: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch orders', details: err.message });
  }
});

// ─── GET /orders/:orderId/track — real-time order tracking ───────────────────
shopDeliveryRouter.get('/orders/:orderId/track', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { orderId } = req.params;
    const db = await database.getClient();

    const result = await db.query(
      `SELECT so.*,
              s.name AS shop_name, s.address AS shop_address,
              s.latitude AS shop_lat, s.longitude AS shop_lng,
              d.name AS driver_name, d.phone AS driver_phone,
              vp.latitude AS driver_lat, vp.longitude AS driver_lng
       FROM shop_orders so
       JOIN shops s ON s.id = so.shop_id
       LEFT JOIN users d ON d.id = so.driver_id
       LEFT JOIN vehicle_positions vp ON vp.driver_id = so.driver_id
       WHERE so.id = $1 AND so.user_id = $2`,
      [orderId, user.id]
    );

    db.release();

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];

    const statusSteps = [
      { key: 'pending',    label: 'Order placed',        done: true },
      { key: 'confirmed',  label: 'Shop confirmed',       done: ['confirmed','picking','in_transit','delivered'].includes(order.status) },
      { key: 'picking',    label: 'Driver picking up',    done: ['picking','in_transit','delivered'].includes(order.status) },
      { key: 'in_transit', label: 'On the way',           done: ['in_transit','delivered'].includes(order.status) },
      { key: 'delivered',  label: 'Delivered',            done: order.status === 'delivered' },
    ];

    res.json({ order, status_steps: statusSteps });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to track order', details: err.message });
  }
});

// ─── POST /orders/:orderId/rate — rate a delivered order ─────────────────────
shopDeliveryRouter.post('/orders/:orderId/rate', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { orderId } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const db = await database.getClient();

    const orderResult = await db.query(
      `SELECT * FROM shop_orders WHERE id = $1 AND user_id = $2 AND status = 'delivered'`,
      [orderId, user.id]
    );

    if (orderResult.rowCount === 0) {
      db.release();
      return res.status(400).json({ error: 'Order not found or not yet delivered' });
    }

    const order: ShopOrder = orderResult.rows[0];

    await db.query(
      `INSERT INTO shop_ratings (shop_id, user_id, order_id, rating, review)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, order_id) DO UPDATE SET rating = $4, review = $5`,
      [order.shop_id, user.id, orderId, rating, review]
    );

    db.release();
    res.json({ message: 'Thank you for your rating!', rating });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit rating', details: err.message });
  }
});

// ─── POST /shops/register — vendor registration ───────────────────────────────
shopDeliveryRouter.post('/shops/register', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      name, description, category, address, latitude, longitude,
      delivery_fee = 500, min_order_amount = 1000,
      delivery_time_min = 15, delivery_time_max = 45,
      is_university_vendor = false, university_name,
    } = req.body;

    if (!name || !category || !address) {
      return res.status(400).json({ error: 'name, category, and address are required' });
    }

    const db = await database.getClient();

    const result = await db.query(
      `INSERT INTO shops
         (name, description, category, address, latitude, longitude, delivery_fee,
          min_order_amount, delivery_time_min, delivery_time_max,
          is_university_vendor, university_name, owner_id, is_open, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,true)
       RETURNING *`,
      [
        name, description, category, address, latitude, longitude,
        delivery_fee, min_order_amount, delivery_time_min, delivery_time_max,
        is_university_vendor, university_name, user.id,
      ]
    );

    db.release();
    res.status(201).json({ message: 'Shop registered successfully', shop: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to register shop', details: err.message });
  }
});

// ─── GET /categories — list all shop categories ───────────────────────────────
shopDeliveryRouter.get('/categories', (_req: Request, res: Response) => {
  res.json({
    categories: [
      { key: 'grocery',          label: 'Groceries',                icon: '🛒' },
      { key: 'stationary',       label: 'Stationary & Office',      icon: '✏️' },
      { key: 'parcel',           label: 'Parcel & Courier',         icon: '📦' },
      { key: 'clothes',          label: 'Clothes & Fashion',        icon: '👕' },
      { key: 'ornaments',        label: 'Ornaments & Jewellery',    icon: '💍' },
      { key: 'electronics',      label: 'Electronics & Gadgets',    icon: '📱' },
      { key: 'books',            label: 'Books & Stationery',       icon: '📚' },
      { key: 'pharmacy',         label: 'Pharmacy & Health',        icon: '💊' },
      { key: 'university_vendor', label: 'University Marketplace', icon: '🎓' },
      { key: 'other',            label: 'Other',                    icon: '🏪' },
    ],
  });
});

export default shopDeliveryRouter;
