#!/usr/bin/env bash
# Convenience wrapper. The single source of truth is environment-setup/install-macos-requirements.sh.
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/environment-setup/install-macos-requirements.sh" "$@"
