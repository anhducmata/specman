#!/usr/bin/env bash
# specman installer (non-npm fallback)
# Usage: curl -s https://raw.githubusercontent.com/anhducmata/specman/main/install.sh | bash

set -e

REPO="https://raw.githubusercontent.com/anhducmata/specman/main"
INSTALL_DIR="$HOME/.local/bin"
BIN="$INSTALL_DIR/sb"

echo "Installing Specman..."

mkdir -p "$INSTALL_DIR"

if command -v curl &>/dev/null; then
  curl -fsSL "$REPO/bin/sb" -o "$BIN"
elif command -v wget &>/dev/null; then
  wget -q "$REPO/bin/sb" -O "$BIN"
else
  echo "error: curl or wget required" >&2; exit 1
fi

chmod +x "$BIN"

if ! echo "$PATH" | tr ':' '\n' | grep -q "$INSTALL_DIR"; then
  echo ""
  echo "Add this to your shell profile (~/.zshrc or ~/.bashrc):"
  echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
  echo ""
  echo "Then restart your terminal or run:"
  echo "  source ~/.zshrc"
else
  echo "✓ $BIN installed"
  echo ""
  echo "Get started:"
  echo "  cd your-project"
  echo "  sb init"
fi
