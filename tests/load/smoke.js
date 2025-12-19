import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<250'],
  },
}

export default function smokeTest() {
  // Health check
  const health = http.get(`${BASE_URL}/api/health`)
  check(health, { 'health 200': (r) => r.status === 200 })

  // Auth whoami should be 401 when unauthenticated
  const whoami = http.get(`${BASE_URL}/api/accounts/whoami`)
  check(whoami, { 'whoami unauthorized': (r) => r.status === 401 })

  sleep(1)
}
