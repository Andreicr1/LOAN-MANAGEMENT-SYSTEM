/**
 * PDF Parser Service
 * Extracts asset information from signed PDFs from Whole Max
 */
export declare class PDFParserService {
    /**
     * Parse PDF and extract asset information
     * Looks for patterns like vehicle VINs, years, makes, models
     */
    parsePDF(base64Data: string): {
        success: boolean;
        assets?: string[];
        error?: string;
    };
}
