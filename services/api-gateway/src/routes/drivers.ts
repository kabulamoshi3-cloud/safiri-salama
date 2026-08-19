/**
 * Driver Routes
 * Driver registration, verification, vehicle management, and status
 */

import { Router, Request, Response } from 'express';
import { pool } from '../database/connection';

const router = Router();

// Register as driver (after user account creation)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const {
      license_number,
      license_expiry,
      vehicle_make,
      vehicle_model,
      vehicle_year,
      vehicle_color,
      plate_number,
      vehicle_type,
      insurance_number,
      insurance_expiry
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate required fields
    if (!license_number || !plate_number || !vehicle_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if driver profile already exists
    const existing = await pool.query(
      'SELECT id FROM drivers WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Driver profile already exists' });
    }

    // Create driver profile
    const driverResult = await pool.query(
      `INSERT INTO drivers (
        user_id, license_number, license_expiry, verification_status,
        status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *`,
      [userId, license_number, license_expiry, 'pending', 'offline']
    );

    // Create vehicle
    const vehicleResult = await pool.query(
      `INSERT INTO vehicles (
        driver_id, make, model, year, color, plate_number, vehicle_type,
        insurance_number, insurance_expiry, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *`,
      [
        userId,
        vehicle_make,
        vehicle_model,
        vehicle_year,
        vehicle_color,
        plate_number,
        vehicle_type,
        insurance_number,
        insurance_expiry,
        'active'
      ]
    );

    // Update user type to driver
    await pool.query(
      `UPDATE users SET user_type = 'driver' WHERE id = $1`,
      [userId]
    );

    res.status(201).json({
      message: 'Driver registration successful. Awaiting verification.',
      driver: driverResult.rows[0],
      vehicle: vehicleResult.rows[0]
    });
  } catch (error) {
    console.error('Driver registration error:', error);
    res.status(500).json({ error: 'Failed to register driver' });
  }
});

// Get driver profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT
        d.*,
        u.name, u.phone, u.email, u.rating,
        json_agg(
          json_build_object(
            'id', v.id,
            'make', v.make,
            'model', v.model,
            'year', v.year,
            'color', v.color,
            'plate_number', v.plate_number,
            'vehicle_type', v.vehicle_type,
            'status', v.status
          )
        ) as vehicles
      FROM drivers d
      JOIN users u ON d.user_id = u.id
      LEFT JOIN vehicles v ON d.user_id = v.driver_id
      WHERE d.user_id = $1
      GROUP BY d.id, u.id`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get driver profile error:', error);
    res.status(500).json({ error: 'Failed to get driver profile' });
  }
});

// Update driver status (online/offline/on-trip/break)
router.patch('/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { status, latitude, longitude } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Validate status
    const validStatuses = ['offline', 'available', 'on-trip', 'break'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Update driver status
    const result = await pool.query(
      `UPDATE drivers
       SET status = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING *`,
      [status, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Update location if provided
    if (latitude && longitude) {
      await pool.query(
        `INSERT INTO location_history (user_id, latitude, longitude, recorded_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (user_id, recorded_at) DO UPDATE
         SET latitude = $2, longitude = $3`,
        [userId, latitude, longitude]
      );
    }

    res.json({
      message: 'Driver status updated',
      driver: result.rows[0]
    });
  } catch (error) {
    console.error('Update driver status error:', error);
    res.status(500).json({ error: 'Failed to update driver status' });
  }
});

// Get driver statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { period = 'today' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let dateFilter = "DATE(completed_at) = CURRENT_DATE";
    if (period === 'week') {
      dateFilter = "completed_at >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "completed_at >= CURRENT_DATE - INTERVAL '30 days'";
    } else if (period === 'all') {
      dateFilter = "1=1";
    }

    const result = await pool.query(
      `SELECT
        COUNT(*) as total_trips,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_trips,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_trips,
        COALESCE(SUM(final_fare), 0) as total_earnings,
        COALESCE(AVG(final_fare), 0) as average_fare,
        COALESCE(SUM(estimated_distance), 0) as total_distance,
        COALESCE(AVG(passenger_rating), 0) as average_rating
      FROM trips
      WHERE driver_id = $1 AND ${dateFilter}`,
      [userId]
    );

    res.json({
      period,
      stats: result.rows[0]
    });
  } catch (error) {
    console.error('Get driver stats error:', error);
    res.status(500).json({ error: 'Failed to get driver statistics' });
  }
});

// Get driver earnings
router.get('/earnings', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { start_date, end_date, group_by = 'day' } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let query = `
      SELECT
        DATE_TRUNC($3, completed_at) as period,
        COUNT(*) as trips_count,
        SUM(final_fare) as total_earnings,
        SUM(CASE WHEN payment_method = 'cash' THEN final_fare ELSE 0 END) as cash_earnings,
        SUM(CASE WHEN payment_method != 'cash' THEN final_fare ELSE 0 END) as digital_earnings
      FROM trips
      WHERE driver_id = $1
        AND status = 'completed'
        AND completed_at IS NOT NULL
    `;

    const params: any[] = [userId];
    let paramCount = 2;

    if (start_date) {
      query += ` AND completed_at >= $${paramCount}`;
      params.push(start_date);
      paramCount++;
    }

    if (end_date) {
      query += ` AND completed_at <= $${paramCount}`;
      params.push(end_date);
      paramCount++;
    }

    params.push(group_by);

    query += ` GROUP BY period ORDER BY period DESC LIMIT 100`;

    const result = await pool.query(query, params);

    // Calculate totals
    const totals = result.rows.reduce(
      (acc, row) => ({
        total_trips: acc.total_trips + parseInt(row.trips_count),
        total_earnings: acc.total_earnings + parseFloat(row.total_earnings || 0),
        cash_earnings: acc.cash_earnings + parseFloat(row.cash_earnings || 0),
        digital_earnings: acc.digital_earnings + parseFloat(row.digital_earnings || 0)
      }),
      { total_trips: 0, total_earnings: 0, cash_earnings: 0, digital_earnings: 0 }
    );

    res.json({
      earnings_by_period: result.rows,
      totals,
      group_by
    });
  } catch (error) {
    console.error('Get driver earnings error:', error);
    res.status(500).json({ error: 'Failed to get driver earnings' });
  }
});

// Update vehicle information
router.patch('/vehicle/:vehicleId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { vehicleId } = req.params;
    const { make, model, year, color, insurance_number, insurance_expiry, status } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check vehicle ownership
    const checkResult = await pool.query(
      'SELECT driver_id FROM vehicles WHERE id = $1',
      [vehicleId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    if (checkResult.rows[0].driver_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this vehicle' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (make) {
      updates.push(`make = $${paramCount++}`);
      values.push(make);
    }
    if (model) {
      updates.push(`model = $${paramCount++}`);
      values.push(model);
    }
    if (year) {
      updates.push(`year = $${paramCount++}`);
      values.push(year);
    }
    if (color) {
      updates.push(`color = $${paramCount++}`);
      values.push(color);
    }
    if (insurance_number) {
      updates.push(`insurance_number = $${paramCount++}`);
      values.push(insurance_number);
    }
    if (insurance_expiry) {
      updates.push(`insurance_expiry = $${paramCount++}`);
      values.push(insurance_expiry);
    }
    if (status) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(vehicleId);

    const result = await pool.query(
      `UPDATE vehicles
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json({
      message: 'Vehicle updated successfully',
      vehicle: result.rows[0]
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

// Add new vehicle
router.post('/vehicle', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const {
      make,
      model,
      year,
      color,
      plate_number,
      vehicle_type,
      insurance_number,
      insurance_expiry
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!plate_number || !vehicle_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if driver exists
    const driverCheck = await pool.query(
      'SELECT id FROM drivers WHERE user_id = $1',
      [userId]
    );

    if (driverCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }

    // Create vehicle
    const result = await pool.query(
      `INSERT INTO vehicles (
        driver_id, make, model, year, color, plate_number, vehicle_type,
        insurance_number, insurance_expiry, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      RETURNING *`,
      [
        userId,
        make,
        model,
        year,
        color,
        plate_number,
        vehicle_type,
        insurance_number,
        insurance_expiry,
        'active'
      ]
    );

    res.status(201).json({
      message: 'Vehicle added successfully',
      vehicle: result.rows[0]
    });
  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({ error: 'Failed to add vehicle' });
  }
});

// Update driver location
router.post('/location', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { latitude, longitude, heading, speed } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Insert location
    await pool.query(
      `INSERT INTO location_history (
        user_id, latitude, longitude, heading, speed, recorded_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, latitude, longitude, heading, speed]
    );

    res.json({ message: 'Location updated successfully' });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get driver's recent locations
router.get('/location/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { limit = 100, hours = 24 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT latitude, longitude, heading, speed, recorded_at
       FROM location_history
       WHERE user_id = $1
         AND recorded_at >= NOW() - INTERVAL '${hours} hours'
       ORDER BY recorded_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({
      locations: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get location history error:', error);
    res.status(500).json({ error: 'Failed to get location history' });
  }
});

export default router;
