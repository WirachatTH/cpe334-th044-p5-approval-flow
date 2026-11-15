"""Public deployment checks. Credentials are never printed.

Called by .github/workflows/deploy.yml after a deployment:

    python3 deploy/smoke_test.py SERVICE_URL

It checks the live service and exits non-zero (failing the workflow) if a check fails. Each public check is retried
up to 5 times, 3 seconds apart, to tolerate a Cloud Run cold start.

Checks, in order:
  1. GET /api/health  -> {"status": "ok"}
  2. GET /api/ready   -> {"db": "connected"}   (the service reaches its database)
  3. GET /            -> the page of the built UI (<title>Approval Flow</title>)
  4. OPTIONAL sign-in -> sign in, GET /api/auth/me, sign out. It runs only if BOTH environment variables
     SMOKE_EMAIL and SMOKE_PASSWORD are set (set both or neither). The session is signed out even if a check fails.
     The sign-in is sent with the service's own address as its Origin, so it also proves that CLIENT_ORIGINS is right.

Only the Python standard library is used. Offline unit tests: deploy/tests/test_smoke.py
"""
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.request


def request(base, path, data=None, opener=None):
    headers = {}
    if data is not None:
        headers['Content-Type'] = 'application/json'
        # Writes are only accepted from the service's own origin (CLIENT_ORIGINS).
        headers['Origin'] = base
    req = urllib.request.Request(
        base + path,
        headers=headers,
        data=json.dumps(data).encode() if data is not None else None,
    )
    open_url = opener.open if opener else urllib.request.urlopen
    with open_url(req, timeout=30) as response:
        return response.read()


def new_opener():
    """An opener that keeps the session cookie between the sign-in, /api/auth/me, and the sign-out."""
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def check(base):
    for path, predicate in (
        ('/api/health', lambda b: json.loads(b).get('status') == 'ok'),
        ('/api/ready', lambda b: json.loads(b).get('db') == 'connected'),
        ('/', lambda b: b'<title>approval flow</title>' in b.lower()),
    ):
        for attempt in range(5):
            try:
                if not predicate(request(base, path)):
                    raise ValueError('Unexpected response')
                break
            except (urllib.error.URLError, TimeoutError, ValueError):
                if attempt == 4:
                    raise RuntimeError('Smoke check failed: ' + path) from None
                time.sleep(3)
        print('PASS ' + path)

    email, password = os.getenv('SMOKE_EMAIL'), os.getenv('SMOKE_PASSWORD')
    if bool(email) != bool(password):
        raise RuntimeError('Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.')
    if not email:
        print('SKIP sign-in: optional smoke credentials not configured')
        return

    opener = new_opener()
    signed_in = False
    try:
        json.loads(request(base, '/api/auth/login', {'email': email, 'password': password}, opener))
        signed_in = True
        me = json.loads(request(base, '/api/auth/me', opener=opener))
        if not isinstance(me.get('user'), dict):
            raise ValueError('Unexpected response')
        print('PASS sign-in and authenticated /api/auth/me')
    except (urllib.error.URLError, TimeoutError, ValueError):
        raise RuntimeError('Sign-in smoke check failed') from None
    finally:
        if signed_in:
            request(base, '/api/auth/logout', data={}, opener=opener)
            print('PASS sign-out')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 deploy/smoke_test.py SERVICE_URL')
    check(sys.argv[1].rstrip('/'))
