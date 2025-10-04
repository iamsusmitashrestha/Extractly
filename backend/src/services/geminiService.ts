import { GoogleGenerativeAI } from '@google/generative-ai';

interface ExtractionResult {
  parsed_fields: string[];
  extracted: Record<string, any>;
  confidence: Record<string, number>;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-pro', generationConfig: { temperature: 0.4, topK: 60, topP: 0.9 } });
  }

  async extractData(html: string, instruction: string): Promise<ExtractionResult> {
    try {
      console.log('Processing with Gemini...');

      const prompt = this.buildExtractionPrompt(html, instruction);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('Gemini response received');

      // Parse the JSON response
      const extractionResult = this.parseGeminiResponse(text);
      
      return extractionResult;
    } catch (error) {
      console.error(' Gemini processing error:', error);
      throw new Error(`Gemini processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildExtractionPrompt(html: string, instruction: string): string {
    console.log('Building extraction prompt...');
    console.log('HTML content length:', html.length);
    console.log('Instruction:', instruction);
    
    // Clean and preprocess HTML to focus on main content
    const processedHtml = this.preprocessHtml(html);
    
    return `
You are an expert web data extraction AI. Your task is to analyze HTML content and extract specific information based on natural language instructions.

INSTRUCTION: "${instruction}"

HTML CONTENT:
${processedHtml.substring(0, 125000)} ${processedHtml.length > 125000 ? '...[truncated]' : ''}

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

  private preprocessHtml(html: string): string {
    // Generic HTML preprocessing to improve extraction accuracy
    let processed = html;

    // Remove script and style tags that don't contain useful data
    processed = processed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    processed = processed.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    
    // Remove comments
    processed = processed.replace(/<!--[\s\S]*?-->/g, '');
    
    // Remove common noise elements that rarely contain useful data
    processed = processed.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '');
    
    // Clean up excessive whitespace while preserving structure
    processed = processed.replace(/\s+/g, ' ');
    processed = processed.replace(/>\s+</g, '><');
    
    return processed.trim();
  }

  private parseGeminiResponse(response: string): ExtractionResult {
    try {
      // Clean the response - remove any markdown formatting or extra text
      let cleanResponse = response.trim();
      
      // Remove markdown code blocks if present
      cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Find JSON object in the response
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Gemini response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      console.log('Extraction results:', {
        fields: parsed.parsed_fields,
        extracted: parsed.extracted,
        confidence: parsed.confidence
      });

      // Validate the structure
      if (!parsed.parsed_fields || !parsed.extracted || !parsed.confidence) {
        throw new Error('Invalid response structure from Gemini');
      }

      // Ensure arrays and objects are properly formatted
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

      console.log(` Extracted ${result.parsed_fields.length} fields with Gemini`);
      
      return result;
    } catch (error) {
      console.error(' Failed to parse Gemini response:', error);
      console.error('Raw response:', response);
      
      // Return fallback result
      return {
        parsed_fields: ['error'],
        extracted: { error: 'Failed to parse extraction results' },
        confidence: { error: 0.0 }
      };
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Hello, respond with "OK"');
      const response = await result.response;
      return response.text().includes('OK');
    } catch (error) {
      console.error('Gemini health check failed:', error);
      return false;
    }
  }
}

export const geminiService = new GeminiService();
