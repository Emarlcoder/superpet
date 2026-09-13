import { HttpException } from '@nestjs/common';
export class DomainError extends HttpException {
  constructor(
    public code: string,
    public statusCode = 409,
    message = code,
  ) {
    super({ code, message }, statusCode);
  }
}
export function ensure(
  condition: unknown,
  code: string,
  status = 409,
): asserts condition {
  if (!condition) throw new DomainError(code, status);
}
export function json<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, v: unknown) =>
      typeof v === 'bigint' ? v.toString() : v,
    ),
  ) as T;
}
