#!/bin/sh
set -e

# Container entrypoint. It hands control to the command (`node dist/index.js`) with `exec`, so the application is
# PID 1 and receives the SIGTERM that Cloud Run sends for a graceful shutdown.
# https://cloud.google.com/run/docs/container-contract#instance-shutdown
exec "$@"
