import { prisma } from '../config/database';
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

  async getExtractionRecords(skip: number = 0, take: number = 10): Promise<ExtractionRecord[]> {
    return await prisma.extractionRecord.findMany({
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
    });
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
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

export const databaseService = new DatabaseService();
