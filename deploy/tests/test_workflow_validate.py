"""Offline test of the 'Validate deployment settings' step of .github/workflows/deploy.yml.

The step must stop the deployment when a setting is missing. GitHub runs a step with `bash -e`, and `bash -e` does NOT
stop when the first command of an `a && b` line fails, so a check written that way passes with the setting missing.
This test extracts the step's script from the workflow and runs it under `bash -e` with different environments.

Run (repository root):  python3 -m unittest discover -s deploy/tests -p 'test_*.py'
"""
import re
import shutil
import subprocess
import unittest
from pathlib import Path

WORKFLOW = Path(__file__).parents[2] / ".github" / "workflows" / "deploy.yml"
SHA = ("0123456789abcdef" * 3)[:40]  # has letters, so the upper-case form below differs from it
ALL_SET = {"PROJECT_ID": "p", "REGION": "r", "WIF_PROVIDER": "w", "WIF_SERVICE_ACCOUNT": "s", "IMAGE_TAG": SHA}


def bash_path():
    # On Windows the first `bash` on the PATH can be WSL's, so Git Bash is preferred when it is installed.
    git_bash = Path("C:/Program Files/Git/bin/bash.exe")
    return str(git_bash) if git_bash.exists() else (shutil.which("bash") or "bash")


def step_script():
    text = WORKFLOW.read_text(encoding="utf-8")
    start = text.index("- name: Validate deployment settings")
    run = text.index("run: |", start)
    lines = text[run:].splitlines()[1:]
    indent = len(lines[0]) - len(lines[0].lstrip())
    body = []
    for line in lines:
        if line.strip() and len(line) - len(line.lstrip()) < indent:
            break
        body.append(line[indent:] if line.strip() else "")
    return "\n".join(body)


def run_step(env):
    return subprocess.run([bash_path(), "-e", "-c", step_script()], env={"PATH": "/usr/bin:/bin:/mingw64/bin", **env}, capture_output=True, text=True)


class ValidateStepTests(unittest.TestCase):
    def test_the_script_is_found(self):
        self.assertIn("IMAGE_TAG", step_script())

    def test_everything_set_passes(self):
        self.assertEqual(run_step(ALL_SET).returncode, 0)

    def test_each_missing_setting_stops_the_step_and_is_named(self):
        for name in ("PROJECT_ID", "REGION", "WIF_PROVIDER", "WIF_SERVICE_ACCOUNT"):
            with self.subTest(missing=name):
                env = {k: v for k, v in ALL_SET.items() if k != name}
                result = run_step(env)
                self.assertNotEqual(result.returncode, 0, f"the step passed with {name} missing")
                self.assertIn(name, result.stdout + result.stderr)

    def test_nothing_set_stops_the_step(self):
        self.assertNotEqual(run_step({"IMAGE_TAG": SHA}).returncode, 0)

    def test_a_tag_that_is_not_a_full_sha_stops_the_step(self):
        for tag in ("latest", "abc123", SHA[:-1], SHA.upper(), SHA + "0"):
            with self.subTest(tag=tag):
                self.assertNotEqual(run_step({**ALL_SET, "IMAGE_TAG": tag}).returncode, 0)

    def test_the_names_of_the_workflow_variables_are_in_the_message(self):
        result = run_step({"IMAGE_TAG": SHA})
        self.assertTrue(re.search(r"GCP_PROJECT_ID", result.stdout + result.stderr))


if __name__ == "__main__":
    unittest.main()
