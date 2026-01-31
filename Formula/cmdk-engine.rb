# Homebrew formula for cmdk-engine
# Tap: brew tap Priyans-hu/cmdk-engine
# Install: brew install Priyans-hu/cmdk-engine/cmdk-engine
#
# This formula is auto-updated by the release workflow.
# The canonical version lives in: github.com/Priyans-hu/homebrew-cmdk-engine

class CmdkEngine < Formula
  desc "Smart command palette engine — route scanner and config generator"
  homepage "https://github.com/Priyans-hu/cmdk-engine"
  license "MIT"

  # Version and URLs are populated by the release workflow
  # Replace VERSION, TAG, and SHA256 values after a release

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/Priyans-hu/cmdk-engine/releases/download/VERSION_TAG/cmdk-engine-darwin-arm64"
      sha256 "DARWIN_ARM64_SHA256"
    else
      url "https://github.com/Priyans-hu/cmdk-engine/releases/download/VERSION_TAG/cmdk-engine-darwin-x64"
      sha256 "DARWIN_X64_SHA256"
    end
  end

  on_linux do
    url "https://github.com/Priyans-hu/cmdk-engine/releases/download/VERSION_TAG/cmdk-engine-linux-x64"
    sha256 "LINUX_X64_SHA256"
  end

  def install
    binary = Dir["cmdk-engine-*"].first
    bin.install binary => "cmdk-engine"
  end

  test do
    assert_match "cmdk-engine", shell_output("#{bin}/cmdk-engine --help")
  end
end
