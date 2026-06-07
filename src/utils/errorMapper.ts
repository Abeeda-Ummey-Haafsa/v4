/**
 * Centralized Supabase error mapper mapping Postgres error codes and common error phrases
 * to user-friendly messages.
 */
export function mapSupabaseError(error: any): string {
  if (!error) {
    return 'Something went wrong';
  }

  // Handle standard Error objects, Postgres stringified errors, or custom Supabase error objects
  const code = error.code || (error.message && extractCode(error.message));
  const message = String(error.message || error).toLowerCase();

  if (code === '23505') {
    return 'Record already exists';
  }
  if (code === '23503') {
    return 'Related record not found';
  }
  if (message.includes('permission denied') || message.includes('insufficient permissions')) {
    return 'You do not have permission';
  }
  if (message.includes('network error') || message.includes('failed to fetch') || message.includes('network') || message.includes('offline')) {
    return 'Check internet connection';
  }

  return error.message || 'Something went wrong';
}

function extractCode(message: string): string | null {
  const match = message.match(/code\s*:\s*["']?(\d+)["']?/i);
  return match ? match[1] : null;
}
