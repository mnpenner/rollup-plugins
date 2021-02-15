#!/usr/bin/env -S bash -euo pipefail

for dir in packages/*
do (
  cd "$dir"
  sudo pnpm link
) done
