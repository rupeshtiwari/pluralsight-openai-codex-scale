#!/usr/bin/env bash
# Convenience wrapper. The single source of truth is env-setup/setup.sh.
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/env-setup/setup.sh" "$@"
