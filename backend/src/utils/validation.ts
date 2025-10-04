interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface IngestRequestData {
  url: string;
  html: string;
  instruction: string;
}

export const validateIngestRequest = (data: IngestRequestData): ValidationResult => {
  const errors: string[] = [];

  // Validate URL
  if (!data.url || typeof data.url !== 'string') {
    errors.push('URL is required and must be a string');
  } else {
    try {
      new URL(data.url);
    } catch {
      errors.push('URL must be a valid URL format');
    }
  }

  // Validate HTML content
  if (!data.html || typeof data.html !== 'string') {
    errors.push('HTML content is required and must be a string');
  } else {
    const maxHtmlSize = parseInt(process.env.MAX_HTML_SIZE || '5242880'); // 5MB default
    if (data.html.length > maxHtmlSize) {
      errors.push(`HTML content exceeds maximum size of ${maxHtmlSize} characters`);
    }
    if (data.html.trim().length === 0) {
      errors.push('HTML content cannot be empty');
    }
  }

  // Validate instruction
  if (!data.instruction || typeof data.instruction !== 'string') {
    errors.push('Instruction is required and must be a string');
  } else {
    if (data.instruction.trim().length === 0) {
      errors.push('Instruction cannot be empty');
    }
    if (data.instruction.length > 1000) {
      errors.push('Instruction must be less than 1000 characters');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const sanitizeHtml = (html: string): string => {
  // Basic HTML sanitization - remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
};

export const validatePaginationParams = (page?: string, limit?: string): { page: number; limit: number; errors: string[] } => {
  const errors: string[] = [];
  let validatedPage = 1;
  let validatedLimit = 10;

  if (page) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      errors.push('Page must be a positive integer');
    } else if (pageNum > 1000) {
      errors.push('Page cannot exceed 1000');
    } else {
      validatedPage = pageNum;
    }
  }

  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1) {
      errors.push('Limit must be a positive integer');
    } else if (limitNum > 100) {
      errors.push('Limit cannot exceed 100');
    } else {
      validatedLimit = limitNum;
    }
  }

  return {
    page: validatedPage,
    limit: validatedLimit,
    errors
  };
};
