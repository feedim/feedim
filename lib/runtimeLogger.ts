type LogContextValue = string | number | boolean | null | undefined;
type LogContext = Record<string, LogContextValue>;

const SENSITIVE_CONTEXT_KEY = /(id|user|email|token|secret|password|content|message|stack|url|slug|username|cookie|session|authorization)/i;

function sanitizeContext(context?: LogContext) {
  if (!context) return undefined;

  const safeEntries = Object.entries(context).filter(([key, value]) => {
    return value != null && !SENSITIVE_CONTEXT_KEY.test(key);
  });

  return safeEntries.length > 0 ? Object.fromEntries(safeEntries) : undefined;
}

function summarizeError(error: unknown) {
  if (process.env.NODE_ENV === "development") {
    return error;
  }

  if (!error || typeof error !== "object") {
    return undefined;
  }

  const safeError: LogContext = {};
  const maybeName = (error as { name?: unknown }).name;
  const maybeCode = (error as { code?: unknown }).code;
  const maybeStatus = (error as { status?: unknown }).status;

  if (typeof maybeName === "string" && maybeName) {
    safeError.name = maybeName;
  }
  if (typeof maybeCode === "string" || typeof maybeCode === "number") {
    safeError.code = maybeCode;
  }
  if (typeof maybeStatus === "string" || typeof maybeStatus === "number") {
    safeError.status = maybeStatus;
  }

  return Object.keys(safeError).length > 0 ? safeError : undefined;
}

export function logClientError(scope: string, error: unknown) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.error(scope, error);
}

export function logServerError(scope: string, error?: unknown, context?: LogContext) {
  if (process.env.NODE_ENV === "development") {
    if (context && error !== undefined) {
      console.error(scope, context, error);
      return;
    }
    if (context) {
      console.error(scope, context);
      return;
    }
    if (error !== undefined) {
      console.error(scope, error);
      return;
    }

    console.error(scope);
    return;
  }

  const safeContext = sanitizeContext(context);
  const safeError = summarizeError(error);

  if (safeContext && safeError) {
    console.error(scope, safeContext, safeError);
    return;
  }
  if (safeContext) {
    console.error(scope, safeContext);
    return;
  }
  if (safeError) {
    console.error(scope, safeError);
    return;
  }

  console.error(scope);
}
