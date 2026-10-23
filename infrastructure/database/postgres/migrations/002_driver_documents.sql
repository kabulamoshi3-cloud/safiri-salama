-- =============================================================================
-- DalaSmart AI-Powered Mobility Platform
-- PostgreSQL Migration
-- Migration: 002_driver_documents.sql
-- Creates the driver_documents table (missing from initial schema).
-- =============================================================================

-- =============================================================================
-- DRIVER DOCUMENTS TABLE
-- Stores KYC/compliance documents uploaded by drivers.
-- =============================================================================

CREATE TABLE driver_documents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID            NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    document_type       VARCHAR(50)     NOT NULL
                        CHECK (document_type IN (
                            'drivers_license',
                            'vehicle_insurance',
                            'vehicle_registration',
                            'national_id',
                            'selfie'
                        )),
    image_url           TEXT            NOT NULL,
    document_number     VARCHAR(100),
    expiry_date         DATE,
    status              VARCHAR(20)     NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason    TEXT,
    reviewed_by         UUID            REFERENCES users (id) ON DELETE SET NULL,
    reviewed_at         TIMESTAMPTZ,
    uploaded_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT dd_reviewed_after_uploaded CHECK (
        reviewed_at IS NULL OR reviewed_at >= uploaded_at
    )
);

CREATE INDEX idx_driver_documents_user_id ON driver_documents (user_id);
CREATE INDEX idx_driver_documents_status  ON driver_documents (status);

COMMENT ON TABLE driver_documents IS 'KYC/compliance documents uploaded by drivers for verification.';
