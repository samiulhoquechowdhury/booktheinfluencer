/**
 * Domain errors (rules.md §3): services throw these; the global filter maps them to
 * `{ error: { code, message, details } }` with the given HTTP status.
 */
export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} ${id} was not found.`, 404);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'You don’t have access to this resource.') {
    super('FORBIDDEN', message, 403);
  }
}
