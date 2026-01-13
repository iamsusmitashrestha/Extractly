/**
 * Core types for data extraction
 */
export interface ExtractionResult {
    parsed_fields: string[];
    extracted: Record<string, any>;
    confidence: Record<string, number>;
}

/**
 * Supported AI provider names
 */
export enum ProviderName {
    GEMINI = 'gemini',
    OPENAI = 'openai'
}

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
    apiKey: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: any; // Allow provider-specific config
}

/**
 * Base interface that all AI extraction providers must implement
 */
export interface IExtractionProvider {
    /**
     * Extract structured data from HTML using natural language instructions
     * @param html - Raw HTML content to analyze
     * @param instruction - Natural language extraction instruction
     * @returns Structured extraction result with confidence scores
     */
    extractData(html: string, instruction: string): Promise<ExtractionResult>;

    /**
     * Verify provider health and connectivity
     * @returns true if provider is healthy and accessible
     */
    healthCheck(): Promise<boolean>;

    /**
     * Get the name of the provider
     * @returns Provider name (e.g., "gemini", "openai")
     */
    getProviderName(): string;
}
