#!/bin/bash
set -euo pipefail

# cmdk-engine installer
# Usage: curl -fsSL https://raw.githubusercontent.com/Priyans-hu/cmdk-engine/main/install.sh | bash

REPO="Priyans-hu/cmdk-engine"
INSTALL_DIR="${CMDK_ENGINE_INSTALL_DIR:-/usr/local/bin}"

info() { echo "  $*"; }
error() { echo "ERROR: $*" >&2; exit 1; }

# Detect platform
detect_platform() {
  local os arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"

  case "$os" in
    darwin) os="darwin" ;;
    linux) os="linux" ;;
    *) error "Unsupported OS: $os" ;;
  esac

  case "$arch" in
    x86_64|amd64) arch="x64" ;;
    arm64|aarch64) arch="arm64" ;;
    *) error "Unsupported architecture: $arch" ;;
  esac

  echo "${os}-${arch}"
}

# Get latest version from GitHub
get_latest_version() {
  curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep '"tag_name"' \
    | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/'
}

main() {
  echo ""
  echo "  cmdk-engine installer"
  echo ""

  local platform version url binary_name

  platform="$(detect_platform)"
  info "Detected platform: ${platform}"

  version="$(get_latest_version)"
  if [ -z "$version" ]; then
    error "Could not determine latest version. Check https://github.com/${REPO}/releases"
  fi
  info "Latest version: ${version}"

  binary_name="cmdk-engine-${platform}"
  url="https://github.com/${REPO}/releases/download/${version}/${binary_name}"

  info "Downloading ${url}..."
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT

  curl -fsSL "$url" -o "${tmp_dir}/cmdk-engine" || error "Download failed. Binary may not exist for ${platform}."
  chmod +x "${tmp_dir}/cmdk-engine"

  # Verify it runs
  if ! "${tmp_dir}/cmdk-engine" --version >/dev/null 2>&1; then
    error "Downloaded binary is not executable on this platform."
  fi

  info "Installing to ${INSTALL_DIR}/cmdk-engine..."
  if [ -w "$INSTALL_DIR" ]; then
    mv "${tmp_dir}/cmdk-engine" "${INSTALL_DIR}/cmdk-engine"
  else
    sudo mv "${tmp_dir}/cmdk-engine" "${INSTALL_DIR}/cmdk-engine"
  fi

  echo ""
  info "cmdk-engine ${version} installed to ${INSTALL_DIR}/cmdk-engine"
  info "Run 'cmdk-engine --help' to get started."
  echo ""
}

main
