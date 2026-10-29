#!/usr/bin/env ts-node
/**
 * Database Seed Script
 * Populates database with initial data for development/testing
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/skyrex';

async function seedDatabase() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // ═══════════════════════════════════════════════════════════════
    // PROMO CODES
    // ═══════════════════════════════════════════════════════════════
    console.log('\n→ Seeding promo codes...');
    
    const promoCodes = [
      {
        code: 'WELCOME2024',
        description: 'Welcome to SkyRex - 30% off first 3 rides',
        discount_percentage: 30,
        discount_fixed: 0,
        max_uses: 10000,
        valid_until: new Date(Date.now() + 90 * 86400000).toISOString(),
        one_per_user: true,
      },
      {
        code: 'HOLIDAY50',
        description: 'Holiday special - 50% off your ride',
        discount_percentage: 50,
        discount_fixed: 0,
        max_uses: 5000,
        valid_until: new Date(Date.now() + 30 * 86400000).toISOString(),
        one_per_user: false,
      },
      {
        code: 'FLAT500',
        description: 'Get Sh500 off your next ride',
        discount_percentage: 0,
        discount_fixed: 500,
        max_uses: 999999,
        valid_until: new Date(Date.now() + 365 * 86400000).toISOString(),
        one_per_user: false,
      },
      {
        code: 'NEWUSER',
        description: 'New user special - 40% off first ride',
        discount_percentage: 40,
        discount_fixed: 0,
        max_uses: 999999,
        valid_until: new Date(Date.now() + 365 * 86400000).toISOString(),
        one_per_user: true,
      },
    ];

    for (const promo of promoCodes) {
      await client.query(
        `INSERT INTO promo_codes 
         (code, description, discount_percentage, discount_fixed, max_uses, valid_until, one_per_user, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         ON CONFLICT (code) DO NOTHING`,
        [
          promo.code,
          promo.description,
          promo.discount_percentage,
          promo.discount_fixed,
          promo.max_uses,
          promo.valid_until,
          promo.one_per_user,
        ]
      );
    }
    console.log(`  ✓ Seeded ${promoCodes.length} promo codes`);

    // ═══════════════════════════════════════════════════════════════
    // SUBSCRIPTION PLANS
    // ═══════════════════════════════════════════════════════════════
    console.log('\n→ Seeding subscription plans...');

    const plans = [
      {
        name: 'SkyRex Plus',
        description: 'Get 10% off all rides + Sh2,000 monthly credit',
        price_monthly: 10000,
        price_annual: 100000,
        discount_percentage: 10,
        features: ['10% discount on all rides', 'Sh2,000 monthly bonus credit', 'Priority support', 'No surge pricing'],
      },
      {
        name: 'SkyRex Pro',
        description: 'Get 15% off all rides + Sh5,000 monthly credit',
        price_monthly: 20000,
        price_annual: 200000,
        discount_percentage: 15,
        features: ['15% discount on all rides', 'Sh5,000 monthly bonus', 'VIP support', 'Priority booking', 'Exclusive promos'],
      },
      {
        name: 'SkyRex Business',
        description: 'Corporate bulk discount for businesses',
        price_monthly: 100000,
        price_annual: 1000000,
        discount_percentage: 20,
        features: ['20% discount on all corporate trips', 'Dedicated account manager', 'Custom employee allowances', 'Monthly billing', 'API access'],
      },
    ];

    for (const plan of plans) {
      await client.query(
        `INSERT INTO subscription_plans 
         (name, description, price_monthly, price_annual, discount_percentage, features, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT DO NOTHING`,
        [
          plan.name,
          plan.description,
          plan.price_monthly,
          plan.price_annual,
          plan.discount_percentage,
          plan.features,
        ]
      );
    }
    console.log(`  ✓ Seeded ${plans.length} subscription plans`);

    // ═══════════════════════════════════════════════════════════════
    // RESTAURANTS (for food delivery)
    // ═══════════════════════════════════════════════════════════════
    console.log('\n→ Seeding restaurants...');

    const restaurants = [
      {
        name: 'Mama Oliech Restaurant',
        description: 'Authentic Kenyan cuisine & fresh fish',
        address: 'Nairobi CBD, Kenya',
        latitude: -1.2864,
        longitude: 36.8172,
        delivery_fee: 200,
        delivery_time_min: 30,
        delivery_time_max: 45,
      },
      {
        name: 'Java House',
        description: 'Coffee, breakfast & international meals',
        address: 'Westlands, Nairobi',
        latitude: -1.2685,
        longitude: 36.8075,
        delivery_fee: 150,
        delivery_time_min: 25,
        delivery_time_max: 40,
      },
      {
        name: 'KFC Kenya',
        description: 'Fast food, chicken & burgers',
        address: 'Thika Road, Nairobi',
        latitude: -1.2574,
        longitude: 36.8906,
        delivery_fee: 100,
        delivery_time_min: 20,
        delivery_time_max: 35,
      },
      {
        name: 'Artcaffe',
        description: 'Fresh salads, sandwiches & pastries',
        address: 'Karen, Nairobi',
        latitude: -1.3195,
        longitude: 36.7073,
        delivery_fee: 250,
        delivery_time_min: 35,
        delivery_time_max: 50,
      },
    ];

    for (const restaurant of restaurants) {
      await client.query(
        `INSERT INTO restaurants 
         (name, description, address, latitude, longitude, delivery_fee, delivery_time_min, delivery_time_max, is_open)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         ON CONFLICT DO NOTHING`,
        [
          restaurant.name,
          restaurant.description,
          restaurant.address,
          restaurant.latitude,
          restaurant.longitude,
          restaurant.delivery_fee,
          restaurant.delivery_time_min,
          restaurant.delivery_time_max,
        ]
      );
    }
    console.log(`  ✓ Seeded ${restaurants.length} restaurants`);

    // ═══════════════════════════════════════════════════════════════
    // SUPPORT AGENTS
    // ═══════════════════════════════════════════════════════════════
    console.log('\n→ Seeding support agents...');

    const agents = [
      { name: 'Sarah Wanjiru',  email: 'sarah@skyrex.com',  department: 'general'  },
      { name: 'James Omondi',   email: 'james@skyrex.com',  department: 'technical'},
      { name: 'Grace Njeri',    email: 'grace@skyrex.com',  department: 'payment'  },
      { name: 'David Kimani',   email: 'david@skyrex.com',  department: 'safety'   },
    ];

    for (const agent of agents) {
      await client.query(
        `INSERT INTO support_agents (name, email, department, status)
         VALUES ($1, $2, $3, 'available')
         ON CONFLICT DO NOTHING`,
        [agent.name, agent.email, agent.department]
      );
    }
    console.log(`  ✓ Seeded ${agents.length} support agents`);

    console.log('\n✓ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${promoCodes.length} promo codes`);
    console.log(`   • ${plans.length} subscription plans`);
    console.log(`   • ${restaurants.length} restaurants`);
    console.log(`   • ${agents.length} support agents`);
    console.log();

  } catch (error) {
    console.error('✗ Seeding failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedDatabase();
