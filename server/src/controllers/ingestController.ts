import { Router, Request, Response } from 'express';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { databaseService } from '../services/databaseService';
import { geminiService } from '../services/geminiService';
import { validateIngestRequest } from '../utils/validation';
import logger from '../utils/logger';

const router = Router();

interface IngestRequest {
  url: string;
  html: string;
  instruction: string;
}

interface IngestResponse {
  url: string;
  instruction: string;
  parsed_fields: string[];
  extracted: Record<string, any>;
  confidence: Record<string, number>;
  record_id: string;
}

// POST /api/ingest - Main endpoint for processing extraction requests
router.post('/ingest', asyncHandler(async (req: Request, res: Response) => {
  const { url, html, instruction }: IngestRequest = req.body;

  // Validate request
  const validation = validateIngestRequest({ url, html, instruction });
  if (!validation.isValid) {
    throw createError(`Validation failed: ${validation.errors.join(', ')}`, 400);
  }

  logger.info(`Processing extraction request for: ${url}`);
  logger.info(`Instruction: ${instruction}`);

  // Create initial database record
  const record = await databaseService.createExtractionRecord({
    url,
    instruction,
    htmlContent: html,
  });

  logger.info(`Created record with ID: ${record.id}`);

  try {
    // Update status to processing
    await databaseService.updateExtractionRecord(record.id, {
      processingStatus: 'processing'
    });

    // Process with Gemini
    const extractionResult = await geminiService.extractData(html, instruction);

    // Update record with results
    await databaseService.updateExtractionRecord(record.id, {
      parsedFields: extractionResult.parsed_fields,
      extractedData: extractionResult.extracted,
      confidenceScores: extractionResult.confidence,
      processingStatus: 'completed'
    });

    logger.info(`Successfully processed extraction for record: ${record.id}`);

    // Return response
    const response: IngestResponse = {
      url,
      instruction,
      parsed_fields: extractionResult.parsed_fields,
      extracted: extractionResult.extracted,
      confidence: extractionResult.confidence,
      record_id: record.id
    };

    res.json(response);

  } catch (error) {
    logger.error(`Processing failed for record ${record.id}:`, error);

    // Update record with error
    await databaseService.updateExtractionRecord(record.id, {
      processingStatus: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error'
    });

    throw createError('Failed to process extraction request', 500);
  }
}));

// GET /api/records/:id - Get extraction record by ID
router.get('/records/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const record = await databaseService.getExtractionRecord(id);
  if (!record) {
    throw createError('Record not found', 404);
  }

  res.json(record);
}));

// GET /api/records - Get all extraction records (with pagination and search)
router.get('/records', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;
  
  // Search and filter parameters
  const search = req.query.search as string;
  const status = req.query.status as string;
  const sortBy = req.query.sortBy as string || 'createdAt';
  const sortOrder = req.query.sortOrder as string || 'desc';

  const { records, total } = await databaseService.getExtractionRecords(skip, limit, {
    search,
    status,
    sortBy,
    sortOrder
  });

  res.json({
    records,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

export { router as ingestRouter };
