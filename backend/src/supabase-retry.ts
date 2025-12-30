// Retry wrapper for Supabase operations
// Handles transient errors like "schema cache" issues

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a retryable error
      const isRetryable = 
        error.message?.includes('schema cache') ||
        error.message?.includes('Retrying') ||
        error.message?.includes('503') ||
        error.message?.includes('502') ||
        error.message?.includes('504') ||
        error.code === 'PGRST002' || // PostgREST schema cache error
        error.code === 'PGRST116' || // PostgREST schema cache error
        error.code === 'PGRST301';   // PostgREST timeout
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = delayMs * Math.pow(2, attempt - 1);
      if (attempt === 1) {
        // Only log on first retry to avoid spam
        console.log(`⚠️  Retryable error (attempt ${attempt}/${maxRetries}), retrying in ${waitTime}ms...`);
      }
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
}

