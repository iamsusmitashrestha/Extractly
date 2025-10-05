import { prisma } from '../config/database';
import logger from '../utils/logger';
import { ExtractionRecord } from '@prisma/client';

export class DatabaseService {
  async createExtractionRecord(data: {
    url: string;
    instruction: string;
    htmlContent: string;
  }): Promise<ExtractionRecord> {
    return await prisma.extractionRecord.create({
      data: {
        url: data.url,
        instruction: data.instruction,
        htmlContent: data.htmlContent,
        processingStatus: 'pending'
      },
    });
  }

  async updateExtractionRecord(
    id: string,
    data: {
      parsedFields?: any;
      extractedData?: any;
      confidenceScores?: any;
      processingStatus?: string;
      errorMessage?: string;
    }
  ): Promise<ExtractionRecord> {
    return await prisma.extractionRecord.update({
      where: { id },
      data,
    });
  }

  async getExtractionRecord(id: string): Promise<ExtractionRecord | null> {
    return await prisma.extractionRecord.findUnique({
      where: { id },
    });
  }

  async getExtractionRecords(
    skip: number = 0, 
    take: number = 10,
    filters?: {
      search?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: string;
    }
  ): Promise<{ records: ExtractionRecord[]; total: number }> {
    const where: any = {};
    
    // Apply status filter
    if (filters?.status) {
      where.processingStatus = filters.status;
    }
    
    // Apply search filter
    if (filters?.search) {
      where.OR = [
        { url: { contains: filters.search, mode: 'insensitive' } },
        { instruction: { contains: filters.search, mode: 'insensitive' } },
        { errorMessage: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    
    // Determine sort order
    const orderBy: any = {};
    const sortField = filters?.sortBy || 'createdAt';
    const sortDirection = filters?.sortOrder === 'asc' ? 'asc' : 'desc';
    orderBy[sortField] = sortDirection;
    
    // Execute queries in parallel
    const [records, total] = await Promise.all([
      prisma.extractionRecord.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      prisma.extractionRecord.count({ where })
    ]);
    
    return { records, total };
  }

  async getExtractionRecordsCount(): Promise<number> {
    return await prisma.extractionRecord.count();
  }

  async getExtractionRecordsByUrl(url: string): Promise<ExtractionRecord[]> {
    return await prisma.extractionRecord.findMany({
      where: { url },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getExtractionRecordsByStatus(status: string): Promise<ExtractionRecord[]> {
    return await prisma.extractionRecord.findMany({
      where: { processingStatus: status },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async deleteExtractionRecord(id: string): Promise<ExtractionRecord> {
    return await prisma.extractionRecord.delete({
      where: { id },
    });
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}

export const databaseService = new DatabaseService();
