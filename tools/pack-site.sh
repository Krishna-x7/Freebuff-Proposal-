#!/usr/bin/env bash
# Collects exactly the files the page serves into dist/ for a Sites deploy.
# Safe to re-run: dist/ is rebuilt from scratch every time.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf dist
mkdir -p dist/Assets

cp index.html styles.css script.js dist/
cp Assets/*.svg Assets/Yes.mp3 Assets/No.mp3 dist/Assets/
# generated stand-ins, only used if an mp3 above ever goes missing
cp popper.wav cry.wav dist/

echo "packed $(find dist -type f | wc -l | tr -d ' ') files, $(du -sh dist | cut -f1)"
