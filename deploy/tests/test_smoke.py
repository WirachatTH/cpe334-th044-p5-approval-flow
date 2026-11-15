"""Offline unit tests for deploy/smoke_test.py (the network is mocked).

Run (repository root):  python3 -m unittest discover -s deploy/tests -p 'test_smoke.py'
CI runs it too (.github/workflows/ci-docker.yml).

Covers: the public checks pass and the optional sign-in is skipped without credentials; a database that is not
ready fails even if HTTP answers; a page that is not the application fails; the session is signed out even if a
check fails; one credential without the other is refused.
"""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('smoke', Path(__file__).parents[1] / 'smoke_test.py')
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


class SmokeTests(unittest.TestCase):
    def response(self, base, path, data=None, opener=None):
        return {
            '/api/health': b'{"status":"ok"}',
            '/api/ready': b'{"status":"ready","db":"connected"}',
            '/': b'<!doctype html><title>Approval Flow</title>',
            '/api/auth/login': b'{"user":{"id":1}}',
            '/api/auth/me': b'{"user":{"id":1}}',
            '/api/auth/logout': b'',
        }[path]

    @patch.dict('os.environ', {}, clear=True)
    def test_public_checks_pass_and_skip_optional_sign_in(self):
        with patch.object(smoke, 'request', side_effect=self.response) as req:
            smoke.check('https://demo.test')
            self.assertEqual(req.call_count, 3)

    @patch.dict('os.environ', {}, clear=True)
    def test_db_not_ready_fails_even_when_http_responds(self):
        def disconnected(base, path, **kwargs):
            return b'{"db":"disconnected"}' if path == '/api/ready' else self.response(base, path)
        with patch.object(smoke, 'request', side_effect=disconnected), patch.object(smoke.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, '/api/ready'):
                smoke.check('https://demo.test')

    @patch.dict('os.environ', {}, clear=True)
    def test_a_page_that_is_not_the_application_fails(self):
        def other_page(base, path, **kwargs):
            return b'<html><title>Welcome to nginx</title></html>' if path == '/' else self.response(base, path)
        with patch.object(smoke, 'request', side_effect=other_page), patch.object(smoke.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, 'Smoke check failed: /'):
                smoke.check('https://demo.test')

    @patch.dict('os.environ', {'SMOKE_EMAIL': 'smoke@example.test', 'SMOKE_PASSWORD': 'test-only'}, clear=True)
    def test_session_is_signed_out_even_if_me_fails(self):
        def broken_me(base, path, data=None, opener=None):
            if path == '/api/auth/me':
                raise ValueError('Broken response')
            return self.response(base, path, data, opener)
        with patch.object(smoke, 'request', side_effect=broken_me) as req, patch.object(smoke, 'new_opener', return_value=object()):
            with self.assertRaisesRegex(RuntimeError, 'Sign-in smoke'):
                smoke.check('https://demo.test')
            self.assertEqual(req.call_args.args[1], '/api/auth/logout')

    @patch.dict('os.environ', {'SMOKE_EMAIL': 'smoke@example.test'}, clear=True)
    def test_one_credential_without_the_other_is_refused(self):
        with patch.object(smoke, 'request', side_effect=self.response):
            with self.assertRaisesRegex(RuntimeError, 'both SMOKE_EMAIL and SMOKE_PASSWORD'):
                smoke.check('https://demo.test')


if __name__ == '__main__':
    unittest.main()
