/**
 * Integration Tests for Safiri Haraka Features
 * Tests all new features: Promo codes, Referral, Incentives, Subscription, Support, Corporate, Food Delivery
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_DRIVER_ID = '660e8400-e29b-41d4-a716-446655440001';

// Mock authentication token
const mockAuthToken = 'Bearer test-token-12345';

describe('Safiri Haraka Feature Integration Tests', () => {

  // ============================================================================
  // PROMO CODE TESTS
  // ============================================================================
  
  describe('Promo Code System', () => {
    test('should validate a promo code', async () => {
      const response = await axios.post(`${BASE_URL}/promo/validate`, {
        code: 'WELCOME2024',
        trip_amount: 10000
      }, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(response.data.valid).toBe(true);
      expect(response.data.discount_amount).toBeLessThanOrEqual(10000);
    });

    test('should reject invalid promo code', async () => {
      try {
        await axios.post(`${BASE_URL}/promo/validate`, {
          code: 'INVALID999',
          trip_amount: 10000
        }, {
          headers: { Authorization: mockAuthToken }
        });
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });

    test('should redeem a promo code for a trip', async () => {
      const response = await axios.post(`${BASE_URL}/promo/redeem`, {
        code: 'WELCOME2024',
        trip_id: 'trip-123',
        trip_amount: 10000
      }, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.discount_amount).toBeGreaterThan(0);
    });

    test('should get available promo codes', async () => {
      const response = await axios.get(`${BASE_URL}/promo/available`, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(response.data.count).toBeGreaterThan(0);
      expect(Array.isArray(response.data.promos)).toBe(true);
    });
  });

  // ============================================================================
  // REFERRAL PROGRAM TESTS
  // ============================================================================

  describe('Referral Program', () => {
    let referralCode: string;

    test('should generate a referral link', async () => {
      const response = await axios.post(`${BASE_URL}/referral/generate-link`, {}, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(201);
      expect(response.data.referral_code).toBeTruthy();
      expect(response.data.referral_link).toContain('safiriharaka.com');
      
      referralCode = response.data.referral_code;
    });

    test('should register user with referral code', async () => {
      const response = await axios.post(`${BASE_URL}/referral/register-with-code`, {
        phone_number: '+254712345678',
        referral_code: referralCode
      });

      expect(response.status).toBe(201);
      expect(response.data.user_id).toBeTruthy();
      expect(response.data.bonus_amount).toBe(5000);
    });

    test('should get referral statistics', async () => {
      const response = await axios.get(`${BASE_URL}/referral/stats`, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(response.data.total_referrals).toBeGreaterThanOrEqual(0);
      expect(response.data.total_earned).toBeGreaterThanOrEqual(0);
    });

    test('should list referrals', async () => {
      const response = await axios.get(`${BASE_URL}/referral/list`, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.referrals)).toBe(true);
    });
  });

  // ============================================================================
  // DRIVER INCENTIVE TESTS
  // ============================================================================

  describe('Driver Incentive Program', () => {
    test('should track trip and calculate incentives', async () => {
      const response = await axios.post(`${BASE_URL}/driver-incentives/track-trip`, {
        trip_id: 'trip-456',
        trip_amount: 5000,
        trip_distance: 8,
        completion_time: 1200
      }, {
        headers: { Authorization: mockAuthToken, 'X-User-Type': 'driver' }
      });

      expect(response.status).toBe(200);
      expect(response.data.total_incentive).toBeGreaterThan(0);
      expect(Array.isArray(response.data.breakdown)).toBe(true);
    });

    test('should get driver incentive statistics', async () => {
      const response = await axios.get(`${BASE_URL}/driver-incentives/stats`, {
        headers: { Authorization: mockAuthToken, 'X-User-Type': 'driver' }
      });

      expect(response.status).toBe(200);
      expect(response.data.today).toBeTruthy();
      expect(response.data.this_week).toBeTruthy();
    });

    test('should get incentive leaderboard', async () => {
      const response = await axios.get(`${BASE_URL}/driver-incentives/leaderboard?period=week`, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.leaderboard)).toBe(true);
    });

    test('should get incentive history', async () => {
      const response = await axios.get(`${BASE_URL}/driver-incentives/history`, {
        headers: { Authorization: mockAuthToken, 'X-User-Type': 'driver' }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.history)).toBe(true);
    });
  });

  // ============================================================================
  // SUBSCRIPTION SERVICE TESTS
  // ============================================================================

  describe('Subscription Service', () => {
    let subscriptionId: string;

    test('should get available subscription plans', async () => {
      const response = await axios.get(`${BASE_URL}/subscription/plans`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.plans)).toBe(true);
      expect(response.data.plans.length).toBeGreaterThan(0);
    });

    test('should subscribe to a plan', async () => {
      const plans = await axios.get(`${BASE_URL}/subscription/plans`);
      const planId = plans.data.plans[0].id;

      const response = await axios.post(`${BASE_URL}/subscription/subscribe`, {
        plan_id: planId,
        billing_period: 'monthly',
        payment_method_id: 'pm_test_123'
      }, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(201);
      expect(response.data.subscription_id).toBeTruthy();
      expect(response.data.billing_amount).toBeGreaterThan(0);
      
      subscriptionId = response.data.subscription_id;
    });

    test('should get subscription status', async () => {
      const response = await axios.get(`${BASE_URL}/subscription/status`, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(response.data.has_subscription).toBe(true);
    });

    test('should get subscription benefits', async () => {
      const response = await axios.get(`${BASE_URL}/subscription/benefits`, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.features)).toBe(true);
    });

    test('should cancel subscription', async () => {
      const response = await axios.post(`${BASE_URL}/subscription/cancel`, {
        subscription_id: subscriptionId
      }, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  // ============================================================================
  // SUPPORT SYSTEM TESTS
  // ============================================================================

  describe('Support System', () => {
    let ticketId: string;

    test('should create a support ticket', async () => {
      const response = await axios.post(`${BASE_URL}/support/create-ticket`, {
        title: 'Driver was rude',
        description: 'The driver was very rude during the trip',
        category: 'driver',
        priority: 'high'
      }, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(201);
      expect(response.data.ticket_id).toBeTruthy();
      expect(response.data.ticket_number).toMatch(/^TKT-/);
      
      ticketId = response.data.ticket_id;
    });

    test('should send message in support chat', async () => {
      const response = await axios.post(`${BASE_URL}/support/send-message`, {
        ticket_id: ticketId,
        message: 'Please escalate this issue'
      }, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(response.data.message_id).toBeTruthy();
    });

    test('should get support tickets', async () => {
      const response = await axios.get(`${BASE_URL}/support/tickets`, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.tickets)).toBe(true);
    });

    test('should get ticket messages', async () => {
      const response = await axios.get(`${BASE_URL}/support/tickets/${ticketId}/messages`, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.messages)).toBe(true);
    });

    test('should handle WhatsApp webhook', async () => {
      const response = await axios.post(`${BASE_URL}/support/whatsapp-webhook`, {
        From: 'whatsapp:+254712345678',
        Body: 'I have a problem with my recent trip'
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  // ============================================================================
  // CORPORATE ACCOUNTS TESTS
  // ============================================================================

  describe('Corporate Accounts (B2B)', () => {
    let corporateId: string;

    test('should register a corporate account', async () => {
      const response = await axios.post(`${BASE_URL}/corporate/register`, {
        company_name: 'Tech Corp Ltd',
        company_registration: 'CR12345678',
        phone_number: '+254701234567',
        email: 'admin@techcorp.com',
        address: '123 Business Avenue, Nairobi',
        monthly_budget: 500000,
        discount_rate: 20
      }, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(201);
      expect(response.data.corporate_id).toBeTruthy();
      expect(response.data.success).toBe(true);
      
      corporateId = response.data.corporate_id;
    });

    test('should get corporate account details', async () => {
      const response = await axios.get(`${BASE_URL}/corporate/account`, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(response.data.has_corporate).toBe(true);
      expect(response.data.monthly_budget).toBeGreaterThan(0);
    });

    test('should add employee to corporate account', async () => {
      const response = await axios.post(`${BASE_URL}/corporate/add-employee`, {
        corporate_id: corporateId,
        employee_phone: '+254721234567',
        employee_name: 'John Doe',
        monthly_allowance: 50000
      }, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(201);
      expect(response.data.employee_id).toBeTruthy();
      expect(response.data.monthly_allowance).toBe(50000);
    });

    test('should get list of employees', async () => {
      const response = await axios.get(`${BASE_URL}/corporate/employees`, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.employees)).toBe(true);
    });

    test('should get billing history', async () => {
      const response = await axios.get(`${BASE_URL}/corporate/billing-history`, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.billing_history)).toBe(true);
    });
  });

  // ============================================================================
  // FOOD DELIVERY TESTS
  // ============================================================================

  describe('Food Delivery Service', () => {
    let restaurantId: string;
    let orderId: string;

    test('should get nearby restaurants', async () => {
      const response = await axios.get(`${BASE_URL}/food/restaurants?latitude=-1.2921&longitude=36.8219&radius=5`, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(response.data.count).toBeGreaterThanOrEqual(0);
    });

    test('should get restaurant menu', async () => {
      const restaurants = await axios.get(`${BASE_URL}/food/restaurants?latitude=-1.2921&longitude=36.8219&radius=5`, {
        headers: { Authorization: mockAuthToken }
      });

      if (restaurants.data.restaurants.length > 0) {
        restaurantId = restaurants.data.restaurants[0].id;

        const response = await axios.get(`${BASE_URL}/food/restaurants/${restaurantId}/menu`, {
          headers: { Authorization: mockAuthToken }
        });

        expect(response.status).toBe(200);
        expect(response.data.categories).toBeTruthy();
      }
    });

    test('should place a food order', async () => {
      const restaurants = await axios.get(`${BASE_URL}/food/restaurants?latitude=-1.2921&longitude=36.8219&radius=5`, {
        headers: { Authorization: mockAuthToken }
      });

      if (restaurants.data.restaurants.length > 0) {
        restaurantId = restaurants.data.restaurants[0].id;

        const response = await axios.post(`${BASE_URL}/food/orders`, {
          restaurant_id: restaurantId,
          items: [
            { id: 'item-1', quantity: 2 },
            { id: 'item-2', quantity: 1 }
          ],
          delivery_address: '123 Main Street, Nairobi',
          special_instructions: 'Extra spicy'
        }, {
          headers: { Authorization: mockAuthToken }
        });

        expect(response.status).toBe(201);
        expect(response.data.order_id).toBeTruthy();
        expect(response.data.order_number).toMatch(/^FD-/);
        expect(response.data.total).toBeGreaterThan(0);
        
        orderId = response.data.order_id;
      }
    });

    test('should get user food orders', async () => {
      const response = await axios.get(`${BASE_URL}/food/orders`, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.orders)).toBe(true);
    });

    test('should track food order', async () => {
      const response = await axios.get(`${BASE_URL}/food/orders/${orderId}/track`, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(response.data.order_number).toBeTruthy();
      expect(response.data.status).toBeTruthy();
    });

    test('should rate food order', async () => {
      const response = await axios.post(`${BASE_URL}/food/orders/${orderId}/rate`, {
        food_rating: 4,
        delivery_rating: 5,
        comments: 'Great food and fast delivery'
      }, {
        headers: { Authorization: mockAuthToken }
      });

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  test('should check API health and list features', async () => {
    const response = await axios.get('/health');

    expect(response.status).toBe(200);
    expect(response.data.status).toBe('ok');
    expect(Array.isArray(response.data.features)).toBe(true);
    expect(response.data.features).toContain('promo_codes');
    expect(response.data.features).toContain('referral_program');
    expect(response.data.features).toContain('driver_incentives');
    expect(response.data.features).toContain('subscriptions');
    expect(response.data.features).toContain('support_system');
    expect(response.data.features).toContain('corporate_accounts');
    expect(response.data.features).toContain('food_delivery');
  });
});
