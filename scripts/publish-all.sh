#!/usr/bin/env -S bash -euo pipefail

for dir in packages/*
do (
  cd "$dir"
  pnpm run build
  npm version patch
  pnpm publish --ignore-scripts --access public
) done
