-- =============================================================================
-- DalaSmart AI-Powered Mobility Platform
-- PostgreSQL Seed Data
-- Dar es Salaam sample routes, stops, and fare tables
-- =============================================================================

-- Disable triggers during seed to avoid updated_at noise
SET session_replication_role = replica;

-- =============================================================================
-- ADMIN USER (system bootstrap)
-- =============================================================================

INSERT INTO users (id, type, phone, name, language, status, created_at, updated_at)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin', '+255700000001', 'DalaSmart System Admin', 'en', 'active', NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000002', 'admin', '+255700000002', 'DalaSmart Admin Two',   'en', 'active', NOW(), NOW());

-- =============================================================================
-- SAMPLE OPERATORS
-- =============================================================================

INSERT INTO users (id, type, phone, name, language, status, created_at, updated_at)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'operator', '+255712100001', 'Kariakoo Express Ltd',    'sw', 'active', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000002', 'operator', '+255712100002', 'Ubungo Transport Co.',    'sw', 'active', NOW(), NOW()),
    ('10000000-0000-0000-0000-000000000003', 'operator', '+255712100003', 'Temeke Daladala SACCOS',  'sw', 'active', NOW(), NOW());

-- =============================================================================
-- SAMPLE DRIVERS
-- =============================================================================

INSERT INTO users (id, type, phone, name, language, status, created_at, updated_at)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'driver', '+255712200001', 'Juma Mwangi',    'sw', 'active', NOW(), NOW()),
    ('20000000-0000-0000-0000-000000000002', 'driver', '+255712200002', 'Hassan Salim',   'sw', 'active', NOW(), NOW()),
    ('20000000-0000-0000-0000-000000000003', 'driver', '+255712200003', 'Amina Rashidi',  'sw', 'active', NOW(), NOW()),
    ('20000000-0000-0000-0000-000000000004', 'driver', '+255712200004', 'Peter Kimaro',   'sw', 'active', NOW(), NOW()),
    ('20000000-0000-0000-0000-000000000005', 'driver', '+255712200005', 'Fatuma Ally',    'sw', 'active', NOW(), NOW());

-- =============================================================================
-- SAMPLE PASSENGERS
-- =============================================================================

INSERT INTO users (id, type, phone, name, language, status, created_at, updated_at)
VALUES
    ('30000000-0000-0000-0000-000000000001', 'passenger', '+255712300001', 'Grace Mushi',    'sw', 'active', NOW(), NOW()),
    ('30000000-0000-0000-0000-000000000002', 'passenger', '+255712300002', 'David Omondi',   'en', 'active', NOW(), NOW()),
    ('30000000-0000-0000-0000-000000000003', 'passenger', '+255712300003', 'Zainab Hamisi',  'sw', 'active', NOW(), NOW());

INSERT INTO passenger_profiles (id, trust_points, tier, saved_places, saved_routes, favorite_routes, emergency_contacts)
VALUES
    ('30000000-0000-0000-0000-000000000001', 1250, 'silver', '[]', '[]', '{}', '[]'),
    ('30000000-0000-0000-0000-000000000002',  300, 'bronze', '[]', '[]', '{}', '[]'),
    ('30000000-0000-0000-0000-000000000003', 4800, 'gold',   '[]', '[]', '{}', '[]');

-- =============================================================================
-- WALLETS
-- =============================================================================

INSERT INTO wallets (id, user_id, balance_tzs, currency, updated_at)
VALUES
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 15000, 'TZS', NOW()),
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002',  5000, 'TZS', NOW()),
    ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 32000, 'TZS', NOW());

-- =============================================================================
-- STOPS  Dar es Salaam key transit stops
-- Coordinates are approximate WGS-84 positions.
-- =============================================================================

INSERT INTO stops (id, name, name_swahili, latitude, longitude, accessibility_features, created_at, updated_at)
VALUES
    -- Central / CBD area
    ('50000000-0000-0000-0000-000000000001', 'Posta (GPO)',           'Posta',              -6.8160,  39.2803, '{"wheelchair_ramp"}',  NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000002', 'Kariakoo Market',       'Kariakoo',           -6.8200,  39.2720, '{}',                   NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000003', 'Kivukoni Ferry',        'Kivukoni',           -6.8140,  39.2900, '{}',                   NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000004', 'Mnazi Mmoja',           'Mnazi Mmoja',        -6.8230,  39.2780, '{"wheelchair_ramp"}',  NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000005', 'Jangwani',              'Jangwani',           -6.8100,  39.2650, '{}',                   NOW(), NOW()),

    -- Ubungo / Kimara corridor
    ('50000000-0000-0000-0000-000000000006', 'Ubungo Terminal',       'Ubungo',             -6.7900,  39.2200, '{"wheelchair_ramp","low_floor_bus"}', NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000007', 'Kimara',                'Kimara',             -6.7750,  39.1900, '{}',                   NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000008', 'Mwenge',                'Mwenge',             -6.7700,  39.2450, '{}',                   NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000009', 'Morocco',               'Morocco',            -6.7850,  39.2550, '{}',                   NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000010', 'Magomeni',              'Magomeni',           -6.7950,  39.2600, '{}',                   NOW(), NOW()),

    -- Temeke / Mbagala corridor
    ('50000000-0000-0000-0000-000000000011', 'Temeke',                'Temeke',             -6.8700,  39.2900, '{}',                   NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000012', 'Mbagala',               'Mbagala',            -6.9000,  39.3100, '{}',                   NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000013', 'Chang''ombe',           'Chang''ombe',        -6.8500,  39.2950, '{}',                   NOW(), NOW()),

    -- Mlimani / University corridor
    ('50000000-0000-0000-0000-000000000014', 'Mlimani City',          'Mlimani',            -6.7750,  39.2300, '{"wheelchair_ramp"}',  NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000015', 'University of DSM',     'Chuo Kikuu',         -6.7700,  39.2100, '{"wheelchair_ramp"}',  NOW(), NOW()),

    -- Gongo la Mboto / Airport corridor
    ('50000000-0000-0000-0000-000000000016', 'Gongo la Mboto',        'Gongo la Mboto',     -6.8600,  39.2000, '{}',                   NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000017', 'Julius Nyerere Airport','Uwanja wa Ndege',    -6.8780,  39.2025, '{"wheelchair_ramp","low_floor_bus"}', NOW(), NOW()),

    -- Kigamboni / Ferry
    ('50000000-0000-0000-0000-000000000018', 'Kigamboni Ferry',       'Kigamboni',          -6.8300,  39.3100, '{}',                   NOW(), NOW()),

    -- BRT stops (DART corridor)
    ('50000000-0000-0000-0000-000000000019', 'DART Kivukoni',         'DART Kivukoni',      -6.8145,  39.2895, '{"wheelchair_ramp","low_floor_bus","tactile_paving"}', NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000020', 'DART Gerezani',         'DART Gerezani',      -6.8180,  39.2840, '{"wheelchair_ramp","low_floor_bus","tactile_paving"}', NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000021', 'DART Kariakoo',         'DART Kariakoo',      -6.8210,  39.2730, '{"wheelchair_ramp","low_floor_bus","tactile_paving"}', NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000022', 'DART Jangwani',         'DART Jangwani',      -6.8095,  39.2640, '{"wheelchair_ramp","low_floor_bus","tactile_paving"}', NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000023', 'DART Morocco',          'DART Morocco',       -6.7855,  39.2545, '{"wheelchair_ramp","low_floor_bus","tactile_paving"}', NOW(), NOW()),
    ('50000000-0000-0000-0000-000000000024', 'DART Ubungo',           'DART Ubungo',        -6.7905,  39.2195, '{"wheelchair_ramp","low_floor_bus","tactile_paving"}', NOW(), NOW());


-- =============================================================================
-- ROUTES
-- =============================================================================

INSERT INTO routes (id, name, name_swahili, type, stop_ids, polyline, safety_rating, accessibility_features, created_at, updated_at)
VALUES
    -- Route 1: Kariakoo - Ubungo (Daladala)
    (
        '60000000-0000-0000-0000-000000000001',
        'Kariakoo - Ubungo',
        'Kariakoo - Ubungo',
        'daladala',
        ARRAY[
            '50000000-0000-0000-0000-000000000002'::UUID,
            '50000000-0000-0000-0000-000000000004'::UUID,
            '50000000-0000-0000-0000-000000000005'::UUID,
            '50000000-0000-0000-0000-000000000010'::UUID,
            '50000000-0000-0000-0000-000000000009'::UUID,
            '50000000-0000-0000-0000-000000000006'::UUID
        ],
        '[
            {"latitude": -6.8200, "longitude": 39.2720},
            {"latitude": -6.8230, "longitude": 39.2780},
            {"latitude": -6.8100, "longitude": 39.2650},
            {"latitude": -6.7950, "longitude": 39.2600},
            {"latitude": -6.7850, "longitude": 39.2550},
            {"latitude": -6.7900, "longitude": 39.2200}
        ]'::JSONB,
        3.8,
        '{}',
        NOW(), NOW()
    ),

    -- Route 2: Posta - Kimara (Daladala)
    (
        '60000000-0000-0000-0000-000000000002',
        'Posta - Kimara',
        'Posta - Kimara',
        'daladala',
        ARRAY[
            '50000000-0000-0000-0000-000000000001'::UUID,
            '50000000-0000-0000-0000-000000000002'::UUID,
            '50000000-0000-0000-0000-000000000010'::UUID,
            '50000000-0000-0000-0000-000000000008'::UUID,
            '50000000-0000-0000-0000-000000000014'::UUID,
            '50000000-0000-0000-0000-000000000015'::UUID,
            '50000000-0000-0000-0000-000000000007'::UUID
        ],
        '[
            {"latitude": -6.8160, "longitude": 39.2803},
            {"latitude": -6.8200, "longitude": 39.2720},
            {"latitude": -6.7950, "longitude": 39.2600},
            {"latitude": -6.7700, "longitude": 39.2450},
            {"latitude": -6.7750, "longitude": 39.2300},
            {"latitude": -6.7700, "longitude": 39.2100},
            {"latitude": -6.7750, "longitude": 39.1900}
        ]'::JSONB,
        4.1,
        '{}',
        NOW(), NOW()
    ),

    -- Route 3: Kivukoni - Temeke (Daladala)
    (
        '60000000-0000-0000-0000-000000000003',
        'Kivukoni - Temeke',
        'Kivukoni - Temeke',
        'daladala',
        ARRAY[
            '50000000-0000-0000-0000-000000000003'::UUID,
            '50000000-0000-0000-0000-000000000001'::UUID,
            '50000000-0000-0000-0000-000000000004'::UUID,
            '50000000-0000-0000-0000-000000000013'::UUID,
            '50000000-0000-0000-0000-000000000011'::UUID
        ],
        '[
            {"latitude": -6.8140, "longitude": 39.2900},
            {"latitude": -6.8160, "longitude": 39.2803},
            {"latitude": -6.8230, "longitude": 39.2780},
            {"latitude": -6.8500, "longitude": 39.2950},
            {"latitude": -6.8700, "longitude": 39.2900}
        ]'::JSONB,
        3.5,
        '{}',
        NOW(), NOW()
    ),

    -- Route 4: Temeke - Mbagala (Daladala)
    (
        '60000000-0000-0000-0000-000000000004',
        'Temeke - Mbagala',
        'Temeke - Mbagala',
        'daladala',
        ARRAY[
            '50000000-0000-0000-0000-000000000011'::UUID,
            '50000000-0000-0000-0000-000000000012'::UUID
        ],
        '[
            {"latitude": -6.8700, "longitude": 39.2900},
            {"latitude": -6.9000, "longitude": 39.3100}
        ]'::JSONB,
        3.2,
        '{}',
        NOW(), NOW()
    ),

    -- Route 5: DART BRT - Kivukoni to Ubungo
    (
        '60000000-0000-0000-0000-000000000005',
        'DART BRT - Kivukoni to Ubungo',
        'DART BRT - Kivukoni hadi Ubungo',
        'brt',
        ARRAY[
            '50000000-0000-0000-0000-000000000019'::UUID,
            '50000000-0000-0000-0000-000000000020'::UUID,
            '50000000-0000-0000-0000-000000000021'::UUID,
            '50000000-0000-0000-0000-000000000022'::UUID,
            '50000000-0000-0000-0000-000000000023'::UUID,
            '50000000-0000-0000-0000-000000000024'::UUID
        ],
        '[
            {"latitude": -6.8145, "longitude": 39.2895},
            {"latitude": -6.8180, "longitude": 39.2840},
            {"latitude": -6.8210, "longitude": 39.2730},
            {"latitude": -6.8095, "longitude": 39.2640},
            {"latitude": -6.7855, "longitude": 39.2545},
            {"latitude": -6.7905, "longitude": 39.2195}
        ]'::JSONB,
        4.8,
        '{"wheelchair_ramp","low_floor_bus","tactile_paving","audio_announcements"}',
        NOW(), NOW()
    ),

    -- Route 6: Airport - CBD (Daladala)
    (
        '60000000-0000-0000-0000-000000000006',
        'Airport - CBD',
        'Uwanja wa Ndege - Mjini',
        'daladala',
        ARRAY[
            '50000000-0000-0000-0000-000000000017'::UUID,
            '50000000-0000-0000-0000-000000000016'::UUID,
            '50000000-0000-0000-0000-000000000006'::UUID,
            '50000000-0000-0000-0000-000000000002'::UUID,
            '50000000-0000-0000-0000-000000000001'::UUID
        ],
        '[
            {"latitude": -6.8780, "longitude": 39.2025},
            {"latitude": -6.8600, "longitude": 39.2000},
            {"latitude": -6.7900, "longitude": 39.2200},
            {"latitude": -6.8200, "longitude": 39.2720},
            {"latitude": -6.8160, "longitude": 39.2803}
        ]'::JSONB,
        4.0,
        '{}',
        NOW(), NOW()
    );

-- =============================================================================
-- FARE TABLES
-- =============================================================================

INSERT INTO fare_tables (id, route_id, flat_fare_tzs, segment_fares, effective_from, effective_to)
VALUES
    -- Kariakoo - Ubungo: 600 TZS flat
    (
        '70000000-0000-0000-0000-000000000001',
        '60000000-0000-0000-0000-000000000001',
        600,
        '{}'::JSONB,
        '2024-01-01 00:00:00+03',
        NULL
    ),
    -- Posta - Kimara: 800 TZS flat, with segment overrides
    (
        '70000000-0000-0000-0000-000000000002',
        '60000000-0000-0000-0000-000000000002',
        800,
        '{
            "50000000-0000-0000-0000-000000000001:50000000-0000-0000-0000-000000000010": 400,
            "50000000-0000-0000-0000-000000000010:50000000-0000-0000-0000-000000000007": 500
        }'::JSONB,
        '2024-01-01 00:00:00+03',
        NULL
    ),
    -- Kivukoni - Temeke: 500 TZS flat
    (
        '70000000-0000-0000-0000-000000000003',
        '60000000-0000-0000-0000-000000000003',
        500,
        '{}'::JSONB,
        '2024-01-01 00:00:00+03',
        NULL
    ),
    -- Temeke - Mbagala: 400 TZS flat
    (
        '70000000-0000-0000-0000-000000000004',
        '60000000-0000-0000-0000-000000000004',
        400,
        '{}'::JSONB,
        '2024-01-01 00:00:00+03',
        NULL
    ),
    -- DART BRT Kivukoni-Ubungo: 650 TZS flat
    (
        '70000000-0000-0000-0000-000000000005',
        '60000000-0000-0000-0000-000000000005',
        650,
        '{}'::JSONB,
        '2024-01-01 00:00:00+03',
        NULL
    ),
    -- Airport - CBD: 1000 TZS flat
    (
        '70000000-0000-0000-0000-000000000006',
        '60000000-0000-0000-0000-000000000006',
        1000,
        '{}'::JSONB,
        '2024-01-01 00:00:00+03',
        NULL
    );

-- Link fare tables back to routes
UPDATE routes SET fare_table_id = '70000000-0000-0000-0000-000000000001' WHERE id = '60000000-0000-0000-0000-000000000001';
UPDATE routes SET fare_table_id = '70000000-0000-0000-0000-000000000002' WHERE id = '60000000-0000-0000-0000-000000000002';
UPDATE routes SET fare_table_id = '70000000-0000-0000-0000-000000000003' WHERE id = '60000000-0000-0000-0000-000000000003';
UPDATE routes SET fare_table_id = '70000000-0000-0000-0000-000000000004' WHERE id = '60000000-0000-0000-0000-000000000004';
UPDATE routes SET fare_table_id = '70000000-0000-0000-0000-000000000005' WHERE id = '60000000-0000-0000-0000-000000000005';
UPDATE routes SET fare_table_id = '70000000-0000-0000-0000-000000000006' WHERE id = '60000000-0000-0000-0000-000000000006';

-- =============================================================================
-- VEHICLES
-- =============================================================================

INSERT INTO vehicles (id, operator_id, registration_number, type, route_id, status, insurance_expiry, roadworthiness_expiry, created_at, updated_at)
VALUES
    ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'T123 ABC DSM', 'daladala', '60000000-0000-0000-0000-000000000001', 'active',     '2025-12-31', '2025-06-30', NOW(), NOW()),
    ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'T124 DEF DSM', 'daladala', '60000000-0000-0000-0000-000000000001', 'active',     '2025-11-30', '2025-05-31', NOW(), NOW()),
    ('80000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'T200 GHI DSM', 'daladala', '60000000-0000-0000-0000-000000000002', 'active',     '2025-10-31', '2025-04-30', NOW(), NOW()),
    ('80000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'T201 JKL DSM', 'daladala', '60000000-0000-0000-0000-000000000003', 'active',     '2025-09-30', '2025-03-31', NOW(), NOW()),
    ('80000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 'T300 MNO DSM', 'brt',      '60000000-0000-0000-0000-000000000005', 'active',     '2026-03-31', '2025-09-30', NOW(), NOW()),
    ('80000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', 'T301 PQR DSM', 'daladala', '60000000-0000-0000-0000-000000000004', 'maintenance','2025-08-31', '2025-02-28', NOW(), NOW());

-- =============================================================================
-- DRIVER PROFILES
-- =============================================================================

INSERT INTO driver_profiles (id, license_number, vehicle_id, operator_id, drt_score, verification_status, women_only_verified)
VALUES
    ('20000000-0000-0000-0000-000000000001', 'DL-TZ-2021-001001', '80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 82.50, 'verified', FALSE),
    ('20000000-0000-0000-0000-000000000002', 'DL-TZ-2019-002002', '80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 74.00, 'verified', FALSE),
    ('20000000-0000-0000-0000-000000000003', 'DL-TZ-2022-003003', '80000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 91.25, 'verified', TRUE),
    ('20000000-0000-0000-0000-000000000004', 'DL-TZ-2020-004004', '80000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 65.75, 'verified', FALSE),
    ('20000000-0000-0000-0000-000000000005', 'DL-TZ-2023-005005', '80000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000003', 88.00, 'verified', TRUE);

-- =============================================================================
-- DRT SCORE BREAKDOWNS
-- =============================================================================

INSERT INTO drt_score_breakdowns (id, driver_id, composite_score, safety_rating, punctuality_rating, passenger_feedback_rating, calculated_at)
VALUES
    (uuid_generate_v4(), '20000000-0000-0000-0000-000000000001', 82.50, 85.00, 80.00, 82.50, NOW()),
    (uuid_generate_v4(), '20000000-0000-0000-0000-000000000002', 74.00, 70.00, 75.00, 77.00, NOW()),
    (uuid_generate_v4(), '20000000-0000-0000-0000-000000000003', 91.25, 93.00, 90.00, 90.75, NOW()),
    (uuid_generate_v4(), '20000000-0000-0000-0000-000000000004', 65.75, 62.00, 68.00, 67.25, NOW()),
    (uuid_generate_v4(), '20000000-0000-0000-0000-000000000005', 88.00, 90.00, 87.00, 87.00, NOW());

-- =============================================================================
-- SAMPLE TRANSACTIONS (historical fare payments)
-- =============================================================================

INSERT INTO transactions (id, type, wallet_id, amount_tzs, status, route_id, vehicle_id, created_at, completed_at)
VALUES
    (uuid_generate_v4(), 'fare',  '40000000-0000-0000-0000-000000000001', 600,  'completed', '60000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    (uuid_generate_v4(), 'fare',  '40000000-0000-0000-0000-000000000001', 800,  'completed', '60000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000003', NOW() - INTERVAL '1 day',  NOW() - INTERVAL '1 day'),
    (uuid_generate_v4(), 'topup', '40000000-0000-0000-0000-000000000001', 10000,'completed', NULL, NULL, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
    (uuid_generate_v4(), 'fare',  '40000000-0000-0000-0000-000000000002', 650,  'completed', '60000000-0000-0000-0000-000000000005', '80000000-0000-0000-0000-000000000005', NOW() - INTERVAL '1 day',  NOW() - INTERVAL '1 day'),
    (uuid_generate_v4(), 'fare',  '40000000-0000-0000-0000-000000000003', 500,  'completed', '60000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000004', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours');

-- =============================================================================
-- SAFETY TIPS
-- =============================================================================

INSERT INTO safety_tips (id, content_en, content_sw, schedule_tag, active, created_at)
VALUES
    (uuid_generate_v4(), 'Always confirm the vehicle registration number before boarding.', 'Daima thibitisha nambari ya usajili wa gari kabla ya kupanda.', NULL, TRUE, NOW()),
    (uuid_generate_v4(), 'Share your live trip with a trusted contact when travelling at night.', 'Shiriki safari yako ya moja kwa moja na mtu unayemwamini unaposafiri usiku.', 'night', TRUE, NOW()),
    (uuid_generate_v4(), 'Use the emergency button if you feel unsafe  your location will be shared with our response team.', 'Tumia kitufe cha dharura ukihisi hatari  mahali ulipo patatumwa kwa timu yetu ya majibu.', NULL, TRUE, NOW()),
    (uuid_generate_v4(), 'Keep your belongings secure and be aware of your surroundings at busy stops.', 'Weka vitu vyako salama na uwe makini na mazingira yako kwenye vituo vilivyosongamana.', NULL, TRUE, NOW()),
    (uuid_generate_v4(), 'During heavy rains, allow extra travel time as routes may be slower.', 'Wakati wa mvua kubwa, acha muda zaidi wa safari kwani njia zinaweza kuwa polepole zaidi.', 'rainy_season', TRUE, NOW());

-- =============================================================================
-- FAQ ENTRIES (AI chatbot knowledge base)
-- =============================================================================

INSERT INTO faq_entries (id, question_en, question_sw, answer_en, answer_sw, category, active, created_at)
VALUES
    (
        uuid_generate_v4(),
        'How do I top up my wallet?',
        'Ninawezaje kujaza pochi yangu?',
        'Open the app, go to Wallet, tap "Top Up", select your mobile money provider (M-Pesa, Airtel Money, or Tigo Pesa), enter the amount, and confirm with your mobile money PIN.',
        'Fungua programu, nenda kwenye Pochi, bonyeza "Jaza", chagua mtoa huduma wako wa pesa za simu (M-Pesa, Airtel Money, au Tigo Pesa), ingiza kiasi, na thibitisha na PIN yako ya pesa za simu.',
        'payments',
        TRUE,
        NOW()
    ),
    (
        uuid_generate_v4(),
        'How does QR code payment work?',
        'Malipo ya msimbo wa QR yanafanyaje kazi?',
        'When you board a daladala, open the app and go to Payment. Show your QR code to the driver to scan. The fare is automatically deducted from your wallet.',
        'Unapopanda daladala, fungua programu na nenda kwenye Malipo. Onyesha msimbo wako wa QR kwa dereva ili ascan. Ada inatolewa moja kwa moja kutoka kwenye pochi yako.',
        'payments',
        TRUE,
        NOW()
    ),
    (
        uuid_generate_v4(),
        'What is the DRT Score?',
        'Alama ya DRT ni nini?',
        'The Driver Reputation and Trust (DRT) Score is a rating from 0 to 100 that reflects a driver''s safety record, punctuality, and passenger feedback. Higher scores indicate more reliable and safer drivers.',
        'Alama ya Sifa na Uaminifu wa Dereva (DRT) ni ukadiriaji kutoka 0 hadi 100 unaoonyesha rekodi ya usalama wa dereva, utaratibu wa wakati, na maoni ya abiria. Alama za juu zinaonyesha madereva wanaotegemewa zaidi na salama zaidi.',
        'drivers',
        TRUE,
        NOW()
    ),
    (
        uuid_generate_v4(),
        'How do I report a safety incident?',
        'Ninawezaje kuripoti tukio la usalama?',
        'Go to the Safety section in the app and tap "Report Incident". Fill in the details, attach any photos or videos (up to 50 MB total), and submit. Our team will review your report within 24 hours.',
        'Nenda kwenye sehemu ya Usalama katika programu na bonyeza "Ripoti Tukio". Jaza maelezo, ambatanisha picha au video zozote (hadi MB 50 jumla), na wasilisha. Timu yetu itakagua ripoti yako ndani ya masaa 24.',
        'safety',
        TRUE,
        NOW()
    ),
    (
        uuid_generate_v4(),
        'Can I use the app without internet?',
        'Ninaweza kutumia programu bila mtandao?',
        'Yes! The app works offline for route maps, stop information, and timetables for your saved routes. Payments and live tracking require an internet connection.',
        'Ndiyo! Programu inafanya kazi bila mtandao kwa ramani za njia, habari za vituo, na ratiba za njia zako zilizohifadhiwa. Malipo na ufuatiliaji wa moja kwa moja unahitaji muunganisho wa mtandao.',
        'general',
        TRUE,
        NOW()
    );

-- =============================================================================
-- AUDIT LOG (sample admin actions)
-- =============================================================================

INSERT INTO audit_log (id, admin_id, action, affected_account_id, reason, timestamp)
VALUES
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'VERIFY_DRIVER', '20000000-0000-0000-0000-000000000001', 'License and background check documents verified successfully.', NOW() - INTERVAL '10 days'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'VERIFY_DRIVER', '20000000-0000-0000-0000-000000000003', 'License and background check documents verified. Women-only service certification confirmed.', NOW() - INTERVAL '8 days'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000002', 'VERIFY_DRIVER', '20000000-0000-0000-0000-000000000005', 'License and background check documents verified. Women-only service certification confirmed.', NOW() - INTERVAL '5 days');

-- =============================================================================
-- Re-enable triggers
-- =============================================================================

SET session_replication_role = DEFAULT;

-- =============================================================================
-- VERIFICATION QUERIES (run after seed to confirm data integrity)
-- =============================================================================

-- SELECT 'users'        AS tbl, COUNT(*) FROM users;
-- SELECT 'stops'        AS tbl, COUNT(*) FROM stops;
-- SELECT 'routes'       AS tbl, COUNT(*) FROM routes;
-- SELECT 'fare_tables'  AS tbl, COUNT(*) FROM fare_tables;
-- SELECT 'vehicles'     AS tbl, COUNT(*) FROM vehicles;
-- SELECT 'wallets'      AS tbl, COUNT(*) FROM wallets;
-- SELECT 'transactions' AS tbl, COUNT(*) FROM transactions;
-- SELECT 'audit_log'    AS tbl, COUNT(*) FROM audit_log;
