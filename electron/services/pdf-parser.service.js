/**
 * PDF Parser Service
 * Extracts asset information from signed PDFs from Whole Max
 */
var PDFParserService = /** @class */ (function () {
    function PDFParserService() {
    }
    /**
     * Parse PDF and extract asset information
     * Looks for patterns like vehicle VINs, years, makes, models
     */
    PDFParserService.prototype.parsePDF = function (base64Data) {
        try {
            // Remove data URL prefix if present
            var base64Clean = base64Data.replace(/^data:application\/pdf;base64,/, '');
            // Convert base64 to buffer
            var pdfBuffer = Buffer.from(base64Clean, 'base64');
            // Convert buffer to string to search for patterns
            var pdfText = pdfBuffer.toString('utf-8', 0, Math.min(pdfBuffer.length, 50000));
            var assets = [];
            // Pattern 1: VIN numbers (17 characters, alphanumeric)
            var vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/g;
            var vins = pdfText.match(vinPattern) || [];
            // Pattern 2: Year Make Model (e.g., "2023 Honda Civic", "2024 Toyota Camry")
            var vehiclePattern = /\b(20\d{2})\s+([A-Z][a-zA-Z]+)\s+([A-Z][a-zA-Z0-9\s]+?)(?=\s+VIN|\s+\d{17}|$)/gi;
            var vehicles = pdfText.matchAll(vehiclePattern);
            // Combine VINs with vehicle info
            var vinArray = Array.from(new Set(vins)); // Remove duplicates
            var vehicleArray = Array.from(vehicles);
            // Create asset strings
            for (var i = 0; i < Math.max(vinArray.length, vehicleArray.length); i++) {
                var assetString = '';
                if (vehicleArray[i]) {
                    var _a = vehicleArray[i], year = _a[1], make = _a[2], model = _a[3];
                    assetString = "".concat(year, " ").concat(make, " ").concat(model.trim());
                }
                if (vinArray[i]) {
                    if (assetString) {
                        assetString += " - VIN: ".concat(vinArray[i]);
                    }
                    else {
                        assetString = "Vehicle - VIN: ".concat(vinArray[i]);
                    }
                }
                if (assetString) {
                    assets.push(assetString);
                }
            }
            // Pattern 3: Generic asset descriptions (fallback)
            if (assets.length === 0) {
                // Look for lines with "Asset", "Vehicle", "Equipment"
                var assetLines = pdfText.match(/(?:Asset|Vehicle|Equipment)[^\n]{10,100}/gi);
                if (assetLines) {
                    assets.push.apply(assets, assetLines.slice(0, 5)); // Max 5 generic matches
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
    };
    return PDFParserService;
}());
export { PDFParserService };
