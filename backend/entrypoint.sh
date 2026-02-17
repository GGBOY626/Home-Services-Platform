#!/bin/sh
set -e
# Ensure upload dir exists and appuser can write (volume may be root-owned on first mount)
mkdir -p /data/uploads
chown -R appuser:appuser /data/uploads
# su-exec drops to appuser and runs java (no shell needed)
exec su-exec appuser java $JAVA_OPTS -jar /app/app.jar
