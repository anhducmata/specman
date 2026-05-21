#!/usr/bin/env bash
# Commander installer
# Usage: curl -s https://raw.githubusercontent.com/.../install.sh | bash

set -e

REPO="https://raw.githubusercontent.com/AmiliAsia/commander/main"
INSTALL_DIR="$HOME/.local/bin"
BIN="$INSTALL_DIR/commander"

echo "Installing Commander..."

# Create install dir if needed
mkdir -p "$INSTALL_DIR"

# Download binary
if command -v curl &>/dev/null; then
  curl -fsSL "$REPO/commander" -o "$BIN"
elif command -v wget &>/dev/null; then
  wget -q "$REPO/commander" -O "$BIN"
else
  echo "error: curl or wget required" >&2; exit 1
fi

chmod +x "$BIN"

# Check PATH
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
  echo "  commander init"
fi
