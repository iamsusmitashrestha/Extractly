import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import logger from '../../utils/logger';
import { ExtractionResult, ProviderConfig, ProviderName } from './IExtractionProvider';
import { BaseExtractionProvider } from './BaseExtractionProvider';
import {
    ProviderError,
    ProviderAuthenticationError,
    ProviderRateLimitError,
    ProviderResponseError
} from './ProviderError';

export class GeminiProvider extends BaseExtractionProvider {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;
    private readonly providerName = ProviderName.GEMINI;
    private readonly MAX_PROMPT_LENGTH = 125000;

    constructor(config: ProviderConfig) {
        super();
        if (!config.apiKey) {
            throw new ProviderAuthenticationError(
                'GEMINI_API_KEY is required',
                this.providerName
            );
        }

        try {
            this.genAI = new GoogleGenerativeAI(config.apiKey);

            const modelName = config.model || 'gemini-flash-latest';
            const generationConfig = {
                temperature: config.temperature || 0.4,
                topK: 60,
                topP: 0.9
            };

            this.model = this.genAI.getGenerativeModel({
                model: modelName,
                generationConfig
            });

            logger.info(`GeminiProvider initialized with model: ${modelName}`);
        } catch (error) {
            throw new ProviderAuthenticationError(
                `Failed to initialize Gemini provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
                this.providerName,
                error instanceof Error ? error : undefined
            );
        }
    }

    getProviderName(): string {
        return this.providerName;
    }

    protected get maxPromptLength(): number {
        return this.MAX_PROMPT_LENGTH;
    }

    protected async generateCompletion(prompt: string): Promise<string> {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }

    protected handleError(error: any): Error {
        // Handle specific Gemini error types
        if (error.message?.includes('API key')) {
            return new ProviderAuthenticationError(
                'Invalid or missing Gemini API key',
                this.providerName,
                error
            );
        }

        if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
            return new ProviderRateLimitError(
                'Gemini API rate limit exceeded',
                this.providerName,
                undefined,
                error
            );
        }

        return new ProviderError(
            `Gemini processing failed: ${error.message || 'Unknown error'}`,
            this.providerName,
            error
        );
    }

    async healthCheck(): Promise<boolean> {
        try {
            const result = await this.model.generateContent('Hello, respond with "OK"');
            const response = await result.response;
            return response.text().includes('OK');
        } catch (error) {
            logger.error('Gemini health check failed:', error);
            return false;
        }
    }

}
