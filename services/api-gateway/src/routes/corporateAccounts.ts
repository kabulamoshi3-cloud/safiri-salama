/**
 * Corporate Accounts (B2B) API Routes
 * Handles company billing, employee budgets, and fleet management
 */

import express, { Request, Response } from 'express';
import { database } from '../database';
import { authMiddleware as auth } from '../middleware/auth';

export const corporateAccountsRouter = express.Router();

/**
 * Data Models
 */
interface CorporateAccount {
  id: string;
  company_name: string;
  company_registration: string;
  admin_id: string;
  phone_number: string;
  email: string;
  address: string;
  monthly_budget: number;
  current_spend: number;
  discount_rate: number;
  created_at: Date;
}

interface EmployeeAllowance {
  id: string;
  corporate_id: string;
  employee_id: string;
  monthly_allowance: number;
  spent_this_month: number;
  reset_date: Date;
}

/**
 * POST /api/v1/corporate/register
 * Register a new corporate account
 */
corporateAccountsRouter.post('/register', auth, async (req: Request, res: Response) => {
  try {
    const {
      company_name,
      company_registration,
      phone_number,
      email,
      address,
      monthly_budget,
      discount_rate = 15
    } = req.body;

    if (!company_name || !company_registration || !monthly_budget) {
      return res.status(400).json({
        error: 'company_name, company_registration, and monthly_budget required'
      });
    }

    // Check if company already registered
    const existingResult = await database.query(
      `SELECT id FROM corporate_accounts WHERE company_registration = $1`,
      [company_registration]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        error: 'Company already registered'
      });
    }

    // Create corporate account
    const result = await database.query(
      `INSERT INTO corporate_accounts 
       (company_name, company_registration, admin_id, phone_number, email, address, 
        monthly_budget, current_spend, discount_rate, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, NOW())
       RETURNING id, company_name`,
      [
        company_name,
        company_registration,
        req.user?.id,
        phone_number,
        email,
        address,
        monthly_budget,
        discount_rate
      ]
    );

    const account = result.rows[0];

    return res.status(201).json({
      success: true,
      corporate_id: account.id,
      company_name: account.company_name,
      message: `Corporate account created. Monthly budget: Sh${monthly_budget}, Discount: ${discount_rate}%`
    });

  } catch (error) {
    console.error('Error registering corporate account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/corporate/add-employee
 * Add employee to corporate account
 */
corporateAccountsRouter.post('/add-employee', auth, async (req: Request, res: Response) => {
  try {
    const { corporate_id, employee_phone, employee_name, monthly_allowance } = req.body;

    if (!corporate_id || !employee_phone || !monthly_allowance) {
      return res.status(400).json({
        error: 'corporate_id, employee_phone, and monthly_allowance required'
      });
    }

    // Verify user is corporate admin
    const adminResult = await database.query(
      `SELECT * FROM corporate_accounts WHERE id = $1 AND admin_id = $2`,
      [corporate_id, req.user?.id]
    );

    if (adminResult.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized - not corporate admin' });
    }

    // Find or create employee user
    let employeeResult = await database.query(
      `SELECT id FROM users WHERE phone_number = $1`,
      [employee_phone]
    );

    let employeeId;
    if (employeeResult.rows.length === 0) {
      // Create new employee user
      const newEmployeeResult = await database.query(
        `INSERT INTO users (phone_number, name, user_type, created_at)
         VALUES ($1, $2, 'passenger', NOW())
         RETURNING id`,
        [employee_phone, employee_name]
      );
      employeeId = newEmployeeResult.rows[0].id;
    } else {
      employeeId = employeeResult.rows[0].id;
    }

    // Create employee allowance
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);

    const allowanceResult = await database.query(
      `INSERT INTO employee_allowances 
       (corporate_id, employee_id, monthly_allowance, spent_this_month, reset_date)
       VALUES ($1, $2, $3, 0, $4)
       RETURNING id`,
      [corporate_id, employeeId, monthly_allowance, nextMonth]
    );

    // Link employee to corporate account
    await database.query(
      `INSERT INTO corporate_employees (corporate_id, employee_id, status)
       VALUES ($1, $2, 'active')`,
      [corporate_id, employeeId]
    );

    return res.status(201).json({
      success: true,
      employee_id: employeeId,
      allowance_id: allowanceResult.rows[0].id,
      monthly_allowance: monthly_allowance,
      message: `Employee added with Sh${monthly_allowance} monthly allowance`
    });

  } catch (error) {
    console.error('Error adding employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/corporate/account
 * Get corporate account details
 */
corporateAccountsRouter.get('/account', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const result = await database.query(
      `SELECT 
        id, company_name, phone_number, email, address,
        monthly_budget, current_spend, discount_rate, created_at
       FROM corporate_accounts 
       WHERE admin_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        has_corporate: false,
        message: 'No corporate account found'
      });
    }

    const account = result.rows[0];
    const budgetPercentage = Math.round((account.current_spend / account.monthly_budget) * 100);

    return res.status(200).json({
      has_corporate: true,
      id: account.id,
      company_name: account.company_name,
      phone_number: account.phone_number,
      email: account.email,
      address: account.address,
      monthly_budget: account.monthly_budget,
      current_spend: account.current_spend,
      remaining_budget: account.monthly_budget - account.current_spend,
      budget_used_percentage: budgetPercentage,
      discount_rate: account.discount_rate,
      created_at: account.created_at
    });

  } catch (error) {
    console.error('Error fetching corporate account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/corporate/employees
 * Get list of employees in corporate account
 */
corporateAccountsRouter.get('/employees', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // Verify user is corporate admin
    const adminResult = await database.query(
      `SELECT id FROM corporate_accounts WHERE admin_id = $1`,
      [userId]
    );

    if (adminResult.rows.length === 0) {
      return res.status(403).json({ error: 'No corporate account found' });
    }

    const corporateId = adminResult.rows[0].id;

    const result = await database.query(
      `SELECT 
        ce.employee_id,
        u.name,
        u.phone_number,
        ea.monthly_allowance,
        ea.spent_this_month,
        ce.status
       FROM corporate_employees ce
       JOIN users u ON ce.employee_id = u.id
       LEFT JOIN employee_allowances ea ON ce.employee_id = ea.employee_id AND ea.corporate_id = $1
       WHERE ce.corporate_id = $1
       ORDER BY u.name ASC`,
      [corporateId]
    );

    return res.status(200).json({
      employees: result.rows.map(emp => ({
        employee_id: emp.employee_id,
        name: emp.name,
        phone_number: emp.phone_number,
        monthly_allowance: emp.monthly_allowance || 0,
        spent_this_month: emp.spent_this_month || 0,
        remaining: (emp.monthly_allowance || 0) - (emp.spent_this_month || 0),
        status: emp.status
      }))
    });

  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/corporate/my-allowance
 * Employee: Get their monthly allowance and usage
 */
corporateAccountsRouter.get('/my-allowance', auth, async (req: Request, res: Response) => {
  try {
    const employeeId = req.user?.id;

    const result = await database.query(
      `SELECT 
        ea.id,
        ca.company_name,
        ea.monthly_allowance,
        ea.spent_this_month,
        ea.reset_date
       FROM employee_allowances ea
       JOIN corporate_accounts ca ON ea.corporate_id = ca.id
       WHERE ea.employee_id = $1
       AND ea.reset_date > NOW()
       LIMIT 1`,
      [employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        has_allowance: false,
        message: 'No active corporate allowance'
      });
    }

    const allowance = result.rows[0];

    return res.status(200).json({
      has_allowance: true,
      company_name: allowance.company_name,
      monthly_allowance: allowance.monthly_allowance,
      spent_this_month: allowance.spent_this_month,
      remaining: allowance.monthly_allowance - allowance.spent_this_month,
      reset_date: allowance.reset_date
    });

  } catch (error) {
    console.error('Error fetching allowance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/corporate/book-trip
 * Book trip using corporate account
 */
corporateAccountsRouter.post('/book-trip', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { pickup_location, dropoff_location, trip_amount } = req.body;

    // Check if employee has active allowance
    const allowanceResult = await database.query(
      `SELECT ea.id, ea.corporate_id, ea.monthly_allowance, ea.spent_this_month, ca.discount_rate
       FROM employee_allowances ea
       JOIN corporate_accounts ca ON ea.corporate_id = ca.id
       WHERE ea.employee_id = $1 AND ea.reset_date > NOW()`,
      [userId]
    );

    if (allowanceResult.rows.length === 0) {
      return res.status(400).json({
        error: 'No active corporate allowance'
      });
    }

    const allowance = allowanceResult.rows[0];

    // Check remaining balance
    const remaining = allowance.monthly_allowance - allowance.spent_this_month;
    if (trip_amount > remaining) {
      return res.status(400).json({
        error: `Insufficient allowance. Remaining: Sh${remaining}, Trip cost: Sh${trip_amount}`
      });
    }

    // Apply corporate discount
    const discountedAmount = Math.floor(trip_amount * (1 - allowance.discount_rate / 100));

    // Create trip
    const tripResult = await database.query(
      `INSERT INTO trips 
       (passenger_id, pickup_location, dropoff_location, original_price, final_price, 
        payment_method, corporate_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'corporate_allowance', $6, 'pending', NOW())
       RETURNING id`,
      [userId, pickup_location, dropoff_location, trip_amount, discountedAmount, allowance.corporate_id]
    );

    const tripId = tripResult.rows[0].id;

    // Update allowance spent
    await database.query(
      `UPDATE employee_allowances 
       SET spent_this_month = spent_this_month + $1
       WHERE id = $2`,
      [discountedAmount, allowance.id]
    );

    return res.status(201).json({
      success: true,
      trip_id: tripId,
      original_price: trip_amount,
      discount_amount: trip_amount - discountedAmount,
      final_price: discountedAmount,
      message: `Trip created with ${allowance.discount_rate}% corporate discount`
    });

  } catch (error) {
    console.error('Error booking trip:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/corporate/billing-history
 * Get corporate billing and usage history
 */
corporateAccountsRouter.get('/billing-history', auth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { months = 6 } = req.query;

    // Verify user is corporate admin
    const adminResult = await database.query(
      `SELECT id FROM corporate_accounts WHERE admin_id = $1`,
      [userId]
    );

    if (adminResult.rows.length === 0) {
      return res.status(403).json({ error: 'No corporate account found' });
    }

    const corporateId = adminResult.rows[0].id;

    const result = await database.query(
      `SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as trips_count,
        SUM(final_price) as total_spend,
        SUM(original_price - final_price) as total_discount
       FROM trips
       WHERE corporate_id = $1 AND created_at >= NOW() - INTERVAL '1 month' * $2
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC`,
      [corporateId, months]
    );

    return res.status(200).json({
      billing_history: result.rows.map(row => ({
        month: new Date(row.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        trips: row.trips_count,
        total_spend: row.total_spend || 0,
        total_discount: row.total_discount || 0
      }))
    });

  } catch (error) {
    console.error('Error fetching billing history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default corporateAccountsRouter;
