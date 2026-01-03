import OpenAI from 'openai';
import logger from '../../utils/logger';
import { ExtractionResult, ProviderConfig, ProviderName } from './IExtractionProvider';
import { BaseExtractionProvider } from './BaseExtractionProvider';
import {
    ProviderError,
    ProviderAuthenticationError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderResponseError
} from './ProviderError';

export class OpenAIProvider extends BaseExtractionProvider {
    private client: OpenAI;
    private model: string;
    private temperature: number;
    private maxTokens: number;
    private readonly providerName = ProviderName.OPENAI;
    private readonly MAX_PROMPT_LENGTH = 125000;

    constructor(config: ProviderConfig) {
        super();
        if (!config.apiKey) {
            throw new ProviderAuthenticationError(
                'OPENAI_API_KEY is required',
                this.providerName
            );
        }

        console.log('-------------------', config);

        try {
            this.client = new OpenAI({
                apiKey: config.apiKey,
            });

            this.model = config.model || 'gpt-4o-mini';
            this.temperature = config.temperature || 0.4;
            this.maxTokens = config.maxTokens || 2000;

            logger.info(`OpenAIProvider initialized with model: ${this.model}`);
        } catch (error) {
            throw new ProviderAuthenticationError(
                `Failed to initialize OpenAI provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
        const completion = await this.client.chat.completions.create({
            model: this.model,
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert web data extraction AI. Your task is to analyze HTML content and extract specific information based on natural language instructions. Always respond with valid JSON only.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: this.temperature,
            max_tokens: this.maxTokens,
            response_format: { type: 'json_object' }
        });

        const responseText = completion.choices[0]?.message?.content;

        if (!responseText) {
            throw new ProviderResponseError(
                'Empty response from OpenAI',
                this.providerName
            );
        }

        return responseText;
    }

    protected handleError(error: any): Error {
        // Handle OpenAI-specific error types
        if (error instanceof OpenAI.APIError) {
            if (error.status === 401) {
                return new ProviderAuthenticationError(
                    'Invalid OpenAI API key',
                    this.providerName,
                    error
                );
            }

            if (error.status === 429) {
                const retryAfter = error.headers?.['retry-after']
                    ? parseInt(error.headers['retry-after'])
                    : undefined;

                return new ProviderRateLimitError(
                    'OpenAI API rate limit exceeded',
                    this.providerName,
                    retryAfter,
                    error
                );
            }

            if (error.code === 'timeout') {
                return new ProviderTimeoutError(
                    'OpenAI request timed out',
                    this.providerName,
                    error
                );
            }
        }

        // Check if it's already a provider error
        if (error instanceof ProviderError) {
            return error;
        }

        return new ProviderError(
            `OpenAI processing failed: ${error.message || 'Unknown error'}`,
            this.providerName,
            error
        );
    }

    async healthCheck(): Promise<boolean> {
        try {
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'user', content: 'Respond with OK' }
                ],
                max_tokens: 10
            });

            const response = completion.choices[0]?.message?.content || '';
            return response.toLowerCase().includes('ok');
        } catch (error) {
            logger.error('OpenAI health check failed:', error);
            return false;
        }
    }
}
