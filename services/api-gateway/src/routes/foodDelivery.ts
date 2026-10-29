/**
 * Food Delivery Service API Routes
 * Handles restaurant orders, delivery tracking, and ratings
 */

import express, { Request, Response } from 'express';
import { database } from '../database';
import { authMiddleware as auth } from '../middleware/auth';

export const foodDeliveryRouter = express.Router();

/**
 * Data Models
 */
interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  logo_url: string;
  rating: number;
  delivery_fee: number;
  delivery_time_min: number;
  delivery_time_max: number;
  is_open: boolean;
}

interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  available: boolean;
}

interface FoodOrder {
  id: string;
  order_number: string;
  user_id: string;
  restaurant_id: string;
  driver_id: string;
  items: MenuItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';
  delivery_address: string;
  created_at: Date;
  delivered_at: Date;
}

/**
 * GET /api/v1/food/restaurants
 * Get list of nearby restaurants
 */
foodDeliveryRouter.get('/restaurants', auth, async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius = 5 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: 'latitude and longitude required'
      });
    }

    const result = await database.query(
      `SELECT 
        id, name, description, address, latitude, longitude, logo_url,
        COALESCE(AVG(fr.rating), 0) as rating,
        delivery_fee, delivery_time_min, delivery_time_max, is_open
       FROM restaurants
       LEFT JOIN food_ratings fr ON restaurants.id = fr.restaurant_id
       WHERE 
        (latitude - $1)^2 + (longitude - $2)^2 <= $3^2
        AND is_open = true
       GROUP BY restaurants.id
       ORDER BY rating DESC
       LIMIT 20`,
      [latitude, longitude, radius]
    );

    return res.status(200).json({
      count: result.rows.length,
      restaurants: result.rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        address: r.address,
        logo: r.logo_url,
        rating: parseFloat(r.rating).toFixed(1),
        delivery_fee: r.delivery_fee,
        delivery_time: `${r.delivery_time_min}-${r.delivery_time_max} min`,
        is_open: r.is_open
      }))
    });

  } catch (error) {
    console.error('Error fetching restaurants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/food/restaurants/:restaurant_id/menu
 * Get restaurant menu
 */
foodDeliveryRouter.get('/restaurants/:restaurant_id/menu', async (req: Request, res: Response) => {
  try {
    const { restaurant_id } = req.params;

    const result = await database.query(
      `SELECT * FROM menu_items 
       WHERE restaurant_id = $1 AND available = true
       ORDER BY category, name ASC`,
      [restaurant_id]
    );

    // Group by category
    const grouped = {};
    result.rows.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image_url
      });
    });

    return res.status(200).json({
      categories: grouped
    });

  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/food/orders
 * Place a food order
 */
foodDeliveryRouter.post('/orders', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { restaurant_id, items, delivery_address, special_instructions } = req.body;

    if (!restaurant_id || !items || items.length === 0 || !delivery_address) {
      return res.status(400).json({
        error: 'restaurant_id, items, and delivery_address required'
      });
    }

    // Get restaurant details
    const restaurantResult = await database.query(
      `SELECT * FROM restaurants WHERE id = $1 AND is_open = true`,
      [restaurant_id]
    );

    if (restaurantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found or closed' });
    }

    const restaurant = restaurantResult.rows[0];

    // Validate items and calculate subtotal
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const menuResult = await database.query(
        `SELECT * FROM menu_items WHERE id = $1 AND restaurant_id = $2 AND available = true`,
        [item.id, restaurant_id]
      );

      if (menuResult.rows.length === 0) {
        return res.status(400).json({ error: `Item ${item.id} not available` });
      }

      const menuItem = menuResult.rows[0];
      const itemTotal = menuItem.price * (item.quantity || 1);
      subtotal += itemTotal;

      orderItems.push({
        id: item.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity || 1,
        total: itemTotal
      });
    }

    // Calculate total with delivery fee
    const deliveryFee = restaurant.delivery_fee;
    const total = subtotal + deliveryFee;

    // Generate order number
    const orderNumber = `FD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create order
    const orderResult = await database.query(
      `INSERT INTO food_orders 
       (order_number, user_id, restaurant_id, items, subtotal, delivery_fee, total, 
        delivery_address, special_instructions, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())
       RETURNING id`,
      [
        orderNumber,
        userId,
        restaurant_id,
        JSON.stringify(orderItems),
        subtotal,
        deliveryFee,
        total,
        delivery_address,
        special_instructions
      ]
    );

    const orderId = orderResult.rows[0].id;

    // TODO: Initiate payment processing

    return res.status(201).json({
      success: true,
      order_id: orderId,
      order_number: orderNumber,
      restaurant: restaurant.name,
      items: orderItems,
      subtotal: subtotal,
      delivery_fee: deliveryFee,
      total: total,
      estimated_delivery: `${restaurant.delivery_time_min}-${restaurant.delivery_time_max} minutes`,
      message: 'Order placed. You will receive updates via SMS and push notification.'
    });

  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/food/orders
 * Get user's food orders
 */
foodDeliveryRouter.get('/orders', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const status = req.query.status as string | undefined;

    let query = `SELECT 
      fo.id, fo.order_number, fo.restaurant_id, r.name as restaurant_name,
      fo.subtotal, fo.delivery_fee, fo.total, fo.status, 
      fo.created_at, fo.delivered_at
     FROM food_orders fo
     JOIN restaurants r ON fo.restaurant_id = r.id
     WHERE fo.user_id = $1`;

    const params = [userId];

    if (status) {
      query += ` AND fo.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY fo.created_at DESC LIMIT 50`;

    const result = await database.query(query, params);

    return res.status(200).json({
      orders: result.rows.map(order => ({
        id: order.id,
        order_number: order.order_number,
        restaurant: order.restaurant_name,
        total: order.total,
        status: order.status,
        placed_at: order.created_at,
        delivered_at: order.delivered_at
      }))
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/food/orders/:order_id/track
 * Track food order delivery
 */
foodDeliveryRouter.get('/orders/:order_id/track', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { order_id } = req.params;

    const orderResult = await database.query(
      `SELECT fo.*, r.name as restaurant_name, d.name as driver_name, d.phone_number as driver_phone
       FROM food_orders fo
       JOIN restaurants r ON fo.restaurant_id = r.id
       LEFT JOIN drivers d ON fo.driver_id = d.id
       WHERE fo.id = $1 AND fo.user_id = $2`,
      [order_id, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    return res.status(200).json({
      order_number: order.order_number,
      status: order.status,
      restaurant: order.restaurant_name,
      driver: order.driver_name,
      driver_phone: order.driver_phone,
      items: JSON.parse(order.items),
      total: order.total,
      delivery_address: order.delivery_address,
      estimated_delivery: '20-30 minutes',
      tracking_url: `https://app.skyrex.com/track/food/${order_id}`,
      message: `Your order is ${order.status}. Driver will arrive soon.`
    });

  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/food/orders/:order_id/rate
 * Rate food order and restaurant
 */
foodDeliveryRouter.post('/orders/:order_id/rate', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { order_id } = req.params;
    const { food_rating, delivery_rating, comments } = req.body;

    if (!food_rating || !delivery_rating) {
      return res.status(400).json({
        error: 'food_rating and delivery_rating required'
      });
    }

    // Get order
    const orderResult = await database.query(
      `SELECT * FROM food_orders WHERE id = $1 AND user_id = $2`,
      [order_id, userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Save ratings
    await database.query(
      `INSERT INTO food_ratings (order_id, restaurant_id, user_id, food_rating, delivery_rating, comments, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [order_id, order.restaurant_id, userId, food_rating, delivery_rating, comments]
    );

    // Update order status
    await database.query(
      `UPDATE food_orders SET status = 'rated' WHERE id = $1`,
      [order_id]
    );

    return res.status(200).json({
      success: true,
      message: 'Thank you for your feedback!'
    });

  } catch (error) {
    console.error('Error rating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/food/restaurants/register (Admin)
 * Register a new restaurant
 */
foodDeliveryRouter.post('/restaurants/register', auth, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const {
      name,
      description,
      address,
      latitude,
      longitude,
      logo_url,
      delivery_fee,
      delivery_time_min,
      delivery_time_max
    } = req.body;

    if (!name || !address || !latitude || !longitude) {
      return res.status(400).json({
        error: 'name, address, latitude, and longitude required'
      });
    }

    const result = await database.query(
      `INSERT INTO restaurants 
       (name, description, address, latitude, longitude, logo_url, 
        delivery_fee, delivery_time_min, delivery_time_max, is_open)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
       RETURNING id, name`,
      [
        name,
        description,
        address,
        latitude,
        longitude,
        logo_url,
        delivery_fee || 0,
        delivery_time_min || 30,
        delivery_time_max || 45
      ]
    );

    return res.status(201).json({
      success: true,
      restaurant_id: result.rows[0].id,
      restaurant_name: result.rows[0].name
    });

  } catch (error) {
    console.error('Error registering restaurant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/food/stats
 * Get food delivery statistics
 */
foodDeliveryRouter.get('/stats', auth, async (req: Request, res: Response) => {
  try {
    if (req.user?.type !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await database.query(
      `SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
        SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END) as total_revenue,
        AVG(CASE WHEN status = 'delivered' THEN (SELECT AVG(food_rating) FROM food_ratings WHERE order_id = food_orders.id) ELSE NULL END) as avg_rating
       FROM food_orders
       WHERE created_at >= NOW() - INTERVAL '30 days'`
    );

    const stats = result.rows[0];

    return res.status(200).json({
      total_orders: stats.total_orders || 0,
      completed_orders: stats.completed_orders || 0,
      total_revenue: stats.total_revenue || 0,
      avg_rating: stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(1) : 'N/A'
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default foodDeliveryRouter;
