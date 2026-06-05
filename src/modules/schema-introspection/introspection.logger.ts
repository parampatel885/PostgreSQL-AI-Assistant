export interface PostgresConnectionDetails {
  host: string;
  port: string;
  database: string;
  ssl: boolean;
}

export function logIntrospectionStep(step: string, meta?: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      scope: "introspection",
      step,
      ...meta,
      timestamp: new Date().toISOString(),
    })
  );
}

export function logIntrospectionError(
  step: string,
  error: unknown,
  meta?: Record<string, unknown>
): void {
  const payload: Record<string, unknown> = {
    scope: "introspection",
    step,
    level: "error",
    ...meta,
    timestamp: new Date().toISOString(),
  };

  if (error instanceof Error) {
    const pgError = error as Error & { code?: string; errno?: number; syscall?: string };
    payload.errorMessage = error.message;
    payload.errorName = error.name;
    payload.errorStack = error.stack;
    payload.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: pgError.code,
      errno: pgError.errno,
      syscall: pgError.syscall,
    };
  } else {
    payload.error = error;
  }

  console.error(JSON.stringify(payload));
}

export function parsePostgresConnectionDetails(databaseUrl: string): PostgresConnectionDetails {
  try {
    const url = new URL(databaseUrl);
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
    const ssl =
      sslMode === "require" ||
      sslMode === "verify-ca" ||
      sslMode === "verify-full" ||
      url.searchParams.get("ssl") === "true";

    return {
      host: url.hostname || "unknown",
      port: url.port || "5432",
      database: url.pathname.replace(/^\//, "") || "(default)",
      ssl,
    };
  } catch {
    return {
      host: "unknown",
      port: "unknown",
      database: "unknown",
      ssl: false,
    };
  }
}

export function isPostgresConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const pgError = error as Error & { code?: string };
  const connectionCodes = new Set([
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
    "ECONNRESET",
    "EHOSTUNREACH",
    "28P01",
    "3D000",
    "57P03",
    "08001",
    "08006",
  ]);

  if (pgError.code && connectionCodes.has(pgError.code)) {
    return true;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("connect") ||
    message.includes("connection") ||
    message.includes("password authentication") ||
    message.includes("does not exist") ||
    message.includes("ssl")
  );
}

export function logPostgresConnectionError(
  step: string,
  error: unknown,
  databaseUrl: string,
  meta?: Record<string, unknown>
): void {
  const connection = parsePostgresConnectionDetails(databaseUrl);
  logIntrospectionError(step, error, {
    ...meta,
    postgresConnection: {
      host: connection.host,
      port: connection.port,
      database: connection.database,
      ssl: connection.ssl,
    },
  });
}

export function buildIntrospectionErrorBody(
  error: unknown,
  projectId: number
): Record<string, unknown> {
  const isProduction = process.env.NODE_ENV === "production";

  if (error instanceof Error) {
    return {
      error: error.message,
      name: error.name,
      projectId,
      ...(isProduction ? {} : { stack: error.stack }),
    };
  }

  return {
    error: String(error),
    name: "UnknownError",
    projectId,
    ...(isProduction ? {} : { stack: undefined }),
  };
}
