import dotenv from 'dotenv';
import { ProviderName } from '../services/providers/IExtractionProvider';

dotenv.config();

/**
 * Supported AI provider types
 */
export type AIProviderType = ProviderName;

/**
 * Provider configuration interface
 */
export interface AIProviderConfig {
    provider: AIProviderType;
    gemini?: {
        apiKey: string;
        model?: string;
        temperature?: number;
    };
    openai?: {
        apiKey: string;
        model?: string;
        temperature?: number;
        maxTokens?: number;
    };
}

/**
 * Load and validate provider configuration from environment variables
 */
export function loadProviderConfig(): AIProviderConfig {
    const providerStr = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

    // Validate provider type
    if (!Object.values(ProviderName).includes(providerStr as ProviderName)) {
        throw new Error(
            `Invalid AI_PROVIDER: ${providerStr}. Must be one of: ${Object.values(ProviderName).join(', ')}`
        );
    }

    const provider = providerStr as AIProviderType;

    const config: AIProviderConfig = {
        provider
    };

    // Load Gemini configuration if key is present
    if (process.env.GEMINI_API_KEY) {
        config.gemini = {
            apiKey: process.env.GEMINI_API_KEY,
            model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
            temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.4')
        };
    } else if (provider === ProviderName.GEMINI) {
        throw new Error('GEMINI_API_KEY environment variable is required when AI_PROVIDER is set to "gemini"');
    }

    // Load OpenAI configuration if key is present
    if (process.env.OPENAI_API_KEY) {
        config.openai = {
            apiKey: process.env.OPENAI_API_KEY,
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.4'),
            maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000')
        };
    } else if (provider === ProviderName.OPENAI) {
        throw new Error('OPENAI_API_KEY environment variable is required when AI_PROVIDER is set to "openai"');
    }

    return config;
}

/**
 * Get the current provider configuration
 */
export const providerConfig = loadProviderConfig();
