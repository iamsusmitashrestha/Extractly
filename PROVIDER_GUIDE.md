# AI Provider Setup Guide

Extractly supports multiple AI providers for data extraction. This guide explains how to configure and use each supported provider.

## Supported Providers

- **Google Gemini** - Fast, cost-effective model with excellent extraction accuracy
- **OpenAI** - Powerful GPT models with structured output support

## Quick Start

### 1. Choose Your Provider

Set the `AI_PROVIDER` environment variable in your `.env` file:

```env
AI_PROVIDER=gemini
```

or

```env
AI_PROVIDER=openai
```

### 2. Configure API Keys

#### For Google Gemini

1. Get your API key from https://makersuite.google.com/app/apikey
2. Add to `.env`:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-flash-latest
GEMINI_TEMPERATURE=0.4
```

#### For OpenAI

1. Get your API key from https://platform.openai.com/api-keys
2. Add to `.env`:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.4
OPENAI_MAX_TOKENS=2000
```

### 3. Restart Server

After updating environment variables:

```bash
npm run dev
```

## Provider Comparison

| Feature | Gemini | OpenAI |
|---------|--------|--------|
| Speed | Very Fast | Fast |
| Cost | Low | Medium |
| Accuracy | Excellent | Excellent |
| Context Length | 125K chars | 100K chars |
| JSON Mode | Manual | Native |
| Rate Limits | Generous | Moderate |
| Best For | High volume, cost-conscious | Enterprise, structured data |

## Configuration Options

### Google Gemini

```env
GEMINI_API_KEY=required
GEMINI_MODEL=gemini-flash-latest (default) or gemini-1.5-pro
GEMINI_TEMPERATURE=0.4 (0.0-1.0, lower is more deterministic)
```

Available models:
- `gemini-flash-latest` - Fast, cost-effective
- `gemini-1.5-pro` - Most capable, higher cost
- `gemini-1.5-flash` - Balance of speed and capability

### OpenAI

```env
OPENAI_API_KEY=required
OPENAI_MODEL=gpt-4o-mini (default), gpt-4o, gpt-4-turbo
OPENAI_TEMPERATURE=0.4 (0.0-2.0, lower is more deterministic)
OPENAI_MAX_TOKENS=2000 (max tokens in response)
```

Available models:
- `gpt-4o-mini` - Cost-effective, fast
- `gpt-4o` - Most capable
- `gpt-4-turbo` - Previous generation, still powerful

## Switching Providers

To switch providers, simply update the `AI_PROVIDER` environment variable and restart the server:

```bash
# Switch to OpenAI
export AI_PROVIDER=openai
export OPENAI_API_KEY=your_key
npm run dev

# Switch to Gemini
export AI_PROVIDER=gemini
export GEMINI_API_KEY=your_key
npm run dev
```

No code changes required. The API response format remains identical.

## Cost Optimization

### Gemini Cost Optimization
- Use `gemini-flash-latest` for most tasks (60 requests/minute free tier)
- Only use `gemini-1.5-pro` when you need the highest accuracy
- Consider caching frequently extracted pages

### OpenAI Cost Optimization
- Use `gpt-4o-mini` for most extraction tasks (much cheaper than gpt-4)
- Reduce `OPENAI_MAX_TOKENS` if responses are typically short
- Monitor usage at https://platform.openai.com/usage

## Pricing Comparison

### Gemini (as of 2024)
- **gemini-flash-latest**: Free tier available, very low cost for paid usage
- **gemini-1.5-pro**: $0.00125 per 1K input tokens

### OpenAI (as of 2024)
- **gpt-4o-mini**: $0.15 per 1M input tokens, $0.60 per 1M output tokens
- **gpt-4o**: $5.00 per 1M input tokens, $15.00 per 1M output tokens

## Troubleshooting

### Provider Not Initializing

**Error:** "Invalid AI_PROVIDER: xyz"
**Solution:** Ensure AI_PROVIDER is set to either `gemini` or `openai`

**Error:** "GEMINI_API_KEY is required"
**Solution:** Add your API key to `.env` file

**Error:** "OPENAI_API_KEY is required"
**Solution:** Add your API key to `.env` file

### Authentication Failures

**Gemini:**
- Verify API key at https://makersuite.google.com/app/apikey
- Check if API key has proper permissions
- Ensure Gemini API is enabled in your Google Cloud project

**OpenAI:**
- Verify API key at https://platform.openai.com/api-keys
- Check if you have credits available
- Ensure your organization has access to the model

### Rate Limiting

**Gemini:**
- Free tier: 60 requests per minute
- Paid tier: Higher limits based on quota
- Wait and retry if you hit limits

**OpenAI:**
- Varies by tier (free, tier 1-5)
- Implement exponential backoff
- Consider upgrading your tier

## Health Check

Verify provider status:

```bash
curl http://localhost:3000/health
```

Response includes provider information:
```json
{
  "status": "ok",
  "service": "Extractly-backend",
  "aiProvider": {
    "name": "gemini",
    "type": "gemini",
    "healthy": true
  }
}
```

## Adding New Providers

To add support for additional providers (e.g., Anthropic Claude, local LLMs):

1. Create a new provider class implementing `IExtractionProvider`:

```typescript
// server/src/services/providers/ClaudeProvider.ts
export class ClaudeProvider implements IExtractionProvider {
  getProviderName(): string { return 'claude'; }
  async extractData(html: string, instruction: string): Promise<ExtractionResult> { }
  async healthCheck(): Promise<boolean> { }
}
```

2. Add configuration in `providerConfig.ts`:

```typescript
export type AIProviderType = 'gemini' | 'openai' | 'claude';
```

3. Register in `ProviderFactory.ts`:

```typescript
case 'claude':
  return new ClaudeProvider(config);
```

4. Update environment variables and documentation

## Support

For issues or questions:
- Check server logs for detailed error messages
- Verify environment variables are correctly set
- Test with both providers to isolate provider-specific issues
- Review provider-specific documentation for API changes
