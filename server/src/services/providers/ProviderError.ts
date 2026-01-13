/**
 * Base error class for all provider-related errors
 */
export class ProviderError extends Error {
    public readonly providerName: string;
    public readonly originalError?: Error;

    constructor(message: string, providerName: string, originalError?: Error) {
        super(message);
        this.name = 'ProviderError';
        this.providerName = providerName;
        this.originalError = originalError;

        // Maintains proper stack trace for where error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * Error thrown when provider authentication fails
 * This typically indicates invalid or missing API keys
 */
export class ProviderAuthenticationError extends ProviderError {
    constructor(message: string, providerName: string, originalError?: Error) {
        super(message, providerName, originalError);
        this.name = 'ProviderAuthenticationError';
    }
}

/**
 * Error thrown when provider rate limits are exceeded
 */
export class ProviderRateLimitError extends ProviderError {
    public readonly retryAfter?: number; // Seconds to wait before retrying

    constructor(message: string, providerName: string, retryAfter?: number, originalError?: Error) {
        super(message, providerName, originalError);
        this.name = 'ProviderRateLimitError';
        this.retryAfter = retryAfter;
    }
}

/**
 * Error thrown when provider request times out
 */
export class ProviderTimeoutError extends ProviderError {
    constructor(message: string, providerName: string, originalError?: Error) {
        super(message, providerName, originalError);
        this.name = 'ProviderTimeoutError';
    }
}

/**
 * Error thrown when provider returns invalid or unparseable response
 */
export class ProviderResponseError extends ProviderError {
    public readonly response?: string;

    constructor(message: string, providerName: string, response?: string, originalError?: Error) {
        super(message, providerName, originalError);
        this.name = 'ProviderResponseError';
        this.response = response;
    }
}
