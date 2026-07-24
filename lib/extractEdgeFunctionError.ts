/**
 * supabase.functions.invoke() throws a FunctionsHttpError whenever an edge
 * function returns a non-2xx status — but that error's own .message is
 * always the generic "Edge Function returned a non-2xx status code",
 * regardless of what the function actually said. The real JSON body
 * (e.g. { error: "Could not verify that account number" }) is sitting on
 * error.context (a Response object) and has to be read out explicitly.
 *
 * Use this everywhere a functions.invoke() error is shown to a user,
 * instead of reading fnError.message directly.
 */
export async function extractEdgeFunctionError(error: any, fallback = 'Something went wrong'): Promise<string> {
  if (error?.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.json();
      if (body?.error) return body.error;
    } catch {
      // context wasn't valid JSON — fall through to the generic message below
    }
  }
  return error?.message ?? fallback;
}
