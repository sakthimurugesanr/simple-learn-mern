/* global __ENV */
import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<500'] },
};
export default function () {
  const base = __ENV.API_URL || 'http://localhost:4000';
  const r = http.get(`${base}/api/v1/catalog/products?limit=12`);
  check(r, {
    'catalog succeeds': (r) => r.status === 200,
    'has products': (r) => Array.isArray(r.json('data')),
  });
  sleep(2);
}
