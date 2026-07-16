export const INTERNAL_AUTH_HEADER = "x-internal-shared-secret";

export function isValidInternalServiceRequest(
  request: Request,
  expectedSecret: string,
): boolean {
  return request.headers.get(INTERNAL_AUTH_HEADER) === expectedSecret;
}
