"use strict";
/**
 * PDF Parser Service
 * Extracts asset information from signed PDFs from Whole Max
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFParserService = void 0;
class PDFParserService {
    /**
     * Parse PDF and extract asset information
     * Looks for patterns like vehicle VINs, years, makes, models
     */
    parsePDF(base64Data) {
        try {
            // Remove data URL prefix if present
            const base64Clean = base64Data.replace(/^data:application\/pdf;base64,/, '');
            // Convert base64 to buffer
            const pdfBuffer = Buffer.from(base64Clean, 'base64');
            // Convert buffer to string to search for patterns
            const pdfText = pdfBuffer.toString('utf-8', 0, Math.min(pdfBuffer.length, 50000));
            const assets = [];
            // Pattern 1: VIN numbers (17 characters, alphanumeric)
            const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
            const vins = pdfText.match(vinPattern) || [];
            // Pattern 2: Year Make Model (e.g., "2023 Honda Civic", "2024 Toyota Camry")
            const vehiclePattern = /\b(20\d{2})\s+([A-Z][a-zA-Z]+)\s+([A-Z][a-zA-Z0-9\s]+?)(?=\s+VIN|\s+\d{17}|$)/gi;
            const vehicles = pdfText.matchAll(vehiclePattern);
            // Combine VINs with vehicle info
            const vinArray = Array.from(new Set(vins)); // Remove duplicates
            const vehicleArray = Array.from(vehicles);
            // Create asset strings
            for (let i = 0; i < Math.max(vinArray.length, vehicleArray.length); i++) {
                let assetString = '';
                if (vehicleArray[i]) {
                    const [, year, make, model] = vehicleArray[i];
                    assetString = `${year} ${make} ${model.trim()}`;
                }
                if (vinArray[i]) {
                    if (assetString) {
                        assetString += ` - VIN: ${vinArray[i]}`;
                    }
                    else {
                        assetString = `Vehicle - VIN: ${vinArray[i]}`;
                    }
                }
                if (assetString) {
                    assets.push(assetString);
                }
            }
            // Pattern 3: Generic asset descriptions (fallback)
            if (assets.length === 0) {
                // Look for lines with "Asset", "Vehicle", "Equipment"
                const assetLines = pdfText.match(/(?:Asset|Vehicle|Equipment)[^\n]{10,100}/gi);
                if (assetLines) {
                    assets.push(...assetLines.slice(0, 5)); // Max 5 generic matches
                }
            }
            if (assets.length === 0) {
                return {
                    success: false,
                    error: 'No assets found in PDF. Please add them manually.',
                };
            }
            return {
                success: true,
                assets: assets.slice(0, 10), // Limit to 10 assets
            };
        }
        catch (error) {
            console.error('Error parsing PDF:', error);
            return {
                success: false,
                error: 'Failed to parse PDF: ' + error.message,
            };
        }
    }
}
exports.PDFParserService = PDFParserService;
