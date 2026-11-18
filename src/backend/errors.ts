export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

/** Logs and rethrows a Supabase error in a shape the ErrorBoundary can display. */
export function handleBackendError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);
  const info = { error: message, operationType, path };
  console.error('Backend error: ', JSON.stringify(info));
  throw new Error(JSON.stringify(info));
}
