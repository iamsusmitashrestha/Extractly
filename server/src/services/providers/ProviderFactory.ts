import { IExtractionProvider, ProviderName } from './IExtractionProvider';
import { GeminiProvider } from './GeminiProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { providerConfig, AIProviderType } from '../../config/providerConfig';
import logger from '../../utils/logger';

/**
 * Factory class for creating AI extraction provider instances
 * Implements the Factory Pattern for flexible provider instantiation
 */
export class ProviderFactory {
    private static instance: IExtractionProvider | null = null;

    /**
     * Get the configured AI extraction provider instance (singleton)
     * The provider is determined by the AI_PROVIDER environment variable
     */
    static getProvider(providerType?: AIProviderType): IExtractionProvider {
        if (providerType) {
            return this.createProvider(providerType);
        }
        if (!this.instance) {
            this.instance = this.createProvider(providerConfig.provider);
        }
        return this.instance;
    }

    /**
     * Create a new provider instance based on the provider type
     * @param providerType - The type of provider to create
     */
    static createProvider(providerType: AIProviderType): IExtractionProvider {
        logger.info(`Creating AI provider: ${providerType}`);

        switch (providerType) {
            case ProviderName.GEMINI:
                if (!providerConfig.gemini) {
                    throw new Error('Gemini configuration is missing');
                }
                return new GeminiProvider({
                    apiKey: providerConfig.gemini.apiKey,
                    model: providerConfig.gemini.model,
                    temperature: providerConfig.gemini.temperature
                });

            case ProviderName.OPENAI:
                if (!providerConfig.openai) {
                    throw new Error('OpenAI configuration is missing');
                }
                return new OpenAIProvider({
                    apiKey: providerConfig.openai.apiKey,
                    model: providerConfig.openai.model,
                    temperature: providerConfig.openai.temperature,
                    maxTokens: providerConfig.openai.maxTokens
                });

            default:
                throw new Error(`Unsupported provider type: ${providerType}`);
        }
    }

    /**
     * Reset the singleton instance (useful for testing or runtime provider switching)
     */
    static resetProvider(): void {
        this.instance = null;
    }

    /**
     * Get information about the current provider
     */
    static getProviderInfo(): { name: string; type: AIProviderType } {
        const provider = this.getProvider();
        return {
            name: provider.getProviderName(),
            type: providerConfig.provider
        };
    }
}
