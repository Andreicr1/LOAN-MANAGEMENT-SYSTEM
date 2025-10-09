-- Update default configuration with complete addresses
-- Run this to populate missing configuration data

UPDATE config SET
  lender_name = 'WMF Corp',
  lender_address = 'P.O. Box 309, Ugland House, Grand Cayman, KY1-1104, Cayman Islands',
  lender_jurisdiction = 'Cayman Islands',
  lender_tax_id = 'N/A',
  
  borrower_name = 'Whole Max',
  borrower_address = '1234 Commerce Boulevard, Miami, FL 33101, United States',
  borrower_jurisdiction = 'Florida, USA',
  borrower_tax_id = '65-1234567'
WHERE id = 1;

