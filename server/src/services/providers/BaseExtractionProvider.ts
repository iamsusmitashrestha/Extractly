import logger from '../../utils/logger';
import { IExtractionProvider, ExtractionResult } from './IExtractionProvider';
import { ProviderResponseError } from './ProviderError';

export abstract class BaseExtractionProvider implements IExtractionProvider {
    abstract getProviderName(): string;
    // Template method for extraction
    async extractData(html: string, instruction: string): Promise<ExtractionResult> {
        try {
            logger.info(`Processing with ${this.getProviderName()} provider...`);

            const prompt = this.buildExtractionPrompt(html, instruction, this.maxPromptLength);
            const responseText = await this.generateCompletion(prompt);

            logger.info(`${this.getProviderName()} response received`);

            return this.parseResponse(responseText);

        } catch (error) {
            logger.error(`${this.getProviderName()} API error:`, error);
            throw this.handleError(error);
        }
    }

    protected abstract get maxPromptLength(): number;
    protected abstract generateCompletion(prompt: string): Promise<string>;
    protected abstract handleError(error: any): Error;
    abstract healthCheck(): Promise<boolean>;

    protected preprocessHtml(html: string): string {
        let processed = html;

        // Remove script and style tags
        processed = processed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        processed = processed.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

        // Remove comments
        processed = processed.replace(/<!--[\s\S]*?-->/g, '');

        // Remove noscript tags
        processed = processed.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');

        // Clean up excessive whitespace
        processed = processed.replace(/\s+/g, ' ');
        processed = processed.replace(/>\s+</g, '><');

        return processed.trim();
    }

    protected validateExtractionResult(parsed: any): ExtractionResult {
        logger.debug('Validating extraction result...');

        const result: ExtractionResult = {
            parsed_fields: Array.isArray(parsed.parsed_fields) ? parsed.parsed_fields : [],
            extracted: typeof parsed.extracted === 'object' ? parsed.extracted : {},
            confidence: typeof parsed.confidence === 'object' ? parsed.confidence : {}
        };

        // Validate confidence scores
        Object.keys(result.confidence).forEach(key => {
            const score = result.confidence[key];
            if (typeof score !== 'number' || score < 0 || score > 1) {
                result.confidence[key] = 0.0;
            }
        });

        return result;
    }

    protected buildExtractionPrompt(html: string, instruction: string, maxLength: number = 100000): string {
        const processedHtml = this.preprocessHtml(html);

        return `
You are an expert web data extraction AI. Your task is to analyze HTML content and extract specific information based on natural language instructions.

INSTRUCTION: "${instruction}"

HTML CONTENT:
${processedHtml.substring(0, maxLength)}${processedHtml.length > maxLength ? '...[truncated]' : ''}

EXTRACTION GUIDELINES:
1. Carefully analyze the instruction to understand what data needs to be extracted
2. Look for the most relevant and prominent elements that match the requested information
3. When multiple similar elements exist, prioritize:
   - Elements that appear to be the main/primary content (larger, more prominent)
   - Elements in the main content area rather than sidebars, headers, or footers
   - Current/active values over historical or alternative values
4. For prices: Focus on the current selling price, not crossed-out or "was" prices
5. For text content: Extract clean text without HTML tags or excessive whitespace
6. For numerical values: Include relevant units or currency symbols when present
7. Assign confidence scores based on how certain you are about the extraction accuracy

RESPONSE FORMAT:
Return ONLY a valid JSON object with this exact structure:

{
  "parsed_fields": ["field1", "field2"],
  "extracted": {
    "field1": "extracted_value1",
    "field2": "extracted_value2"
  },
  "confidence": {
    "field1": 0.95,
    "field2": 0.87
  }
}

CRITICAL RULES:
- Return ONLY the JSON object, no additional text, explanations, or markdown formatting
- If a requested field cannot be found, set its value to null and confidence to 0.0
- Field names should be descriptive and match the instruction intent
- Confidence scores must be between 0.0 and 1.0
- Extract clean, formatted values without HTML tags
- Be consistent in your extraction approach, priotize HTML tags data over JSON data.

Extract the requested data now:`;
    }

    protected parseResponse(response: string): ExtractionResult {
        logger.debug(`Parsing ${this.getProviderName()} response...`);

        try {
            // First attempt: direct JSON parsing
            const parsed = JSON.parse(response);

            if (!parsed.parsed_fields || !parsed.extracted || !parsed.confidence) {
                throw new Error(`Invalid response structure from ${this.getProviderName()}`);
            }

            logger.debug(`Successfully parsed ${this.getProviderName()} response`);
            return this.validateExtractionResult(parsed);

        } catch (error) {
            logger.warn(`Failed to parse ${this.getProviderName()} response directly, attempting fallback...`);
            return this.fallbackParsing(response);
        }
    }

    private fallbackParsing(response: string): ExtractionResult {
        try {
            let cleanResponse = response.trim();

            // Remove markdown code blocks if present
            cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');

            // Find JSON object in the response
            const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error(`No valid JSON found in ${this.getProviderName()} response`);
            }

            const parsed = JSON.parse(jsonMatch[0]);

            logger.info('Fallback parsing successful');

            if (!parsed.parsed_fields || !parsed.extracted || !parsed.confidence) {
                throw new Error(`Invalid response structure from ${this.getProviderName()}`);
            }

            return this.validateExtractionResult(parsed);

        } catch (error) {
            logger.error('Fallback parsing also failed:', error);

            throw new ProviderResponseError(
                `Failed to parse ${this.getProviderName()} extraction results`,
                this.getProviderName(),
                response,
                error instanceof Error ? error : undefined
            );
        }
    }
}
