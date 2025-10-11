-- Migration: Add client-specific credit line columns
-- This migration adds columns to the clients table if they don't exist

-- Add credit_limit column
ALTER TABLE clients ADD COLUMN credit_limit REAL NOT NULL DEFAULT 50000000.00;

-- Add interest_rate_annual column
ALTER TABLE clients ADD COLUMN interest_rate_annual REAL NOT NULL DEFAULT 14.50;

-- Add day_basis column
ALTER TABLE clients ADD COLUMN day_basis INTEGER NOT NULL DEFAULT 360;

-- Add default_due_days column
ALTER TABLE clients ADD COLUMN default_due_days INTEGER NOT NULL DEFAULT 90;

-- Add signatories column
ALTER TABLE clients ADD COLUMN signatories TEXT;

