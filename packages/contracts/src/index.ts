export const API_PREFIX = 'api/v1';

/** Process liveness only. Database readiness is a separate concern. */
export interface HealthResponse {
  status: 'ok';
  service: 'superpet-api';
}
