#!/bin/bash

# Script to restore fastlane configuration and .env files from distribute/ backup
# Run this script after expo prebuild to restore fastlane setup

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DISTRIBUTE_DIR="$SCRIPT_DIR/distribute"
IOS_DIR="$SCRIPT_DIR/ios"
ANDROID_DIR="$SCRIPT_DIR/android"

echo "🔄 Restoring Fastlane configuration from distribute/ backup"
echo "=========================================================="
echo ""

# Check if distribute directory exists
if [ ! -d "$DISTRIBUTE_DIR" ]; then
    echo "❌ Error: distribute/ directory not found at $DISTRIBUTE_DIR"
    exit 1
fi

# Function to restore files for a platform
restore_platform() {
    local platform=$1
    local source_dir="$DISTRIBUTE_DIR/$platform"
    local target_dir="$SCRIPT_DIR/$platform"
    
    if [ ! -d "$source_dir" ]; then
        echo "⚠️  Warning: No backup found for $platform at $source_dir"
        return
    fi
    
    echo "📦 Restoring $platform configuration..."
    
    # Restore .env file
    if [ -f "$source_dir/.env" ]; then
        cp "$source_dir/.env" "$target_dir/.env"
        echo "   ✅ Restored .env"
    else
        echo "   ⚠️  No .env file found in backup"
    fi
    
    # Restore .env.local if exists
    if [ -f "$source_dir/.env.local" ]; then
        cp "$source_dir/.env.local" "$target_dir/.env.local"
        echo "   ✅ Restored .env.local"
    fi
    
    # Restore fastlane directory
    if [ -d "$source_dir/fastlane" ]; then
        # Create fastlane directory if it doesn't exist
        mkdir -p "$target_dir/fastlane"
        
        # Copy all fastlane files (exclude report.xml and other generated files)
        rsync -av --exclude='report.xml' --exclude='*.log' --exclude='.DS_Store' \
            "$source_dir/fastlane/" "$target_dir/fastlane/"
        echo "   ✅ Restored fastlane/ directory"
        
        # List restored files
        echo "   📋 Restored files:"
        find "$source_dir/fastlane" -type f ! -name "report.xml" ! -name "*.log" ! -name ".DS_Store" -exec basename {} \; | sed 's/^/      - /'
    else
        echo "   ⚠️  No fastlane directory found in backup"
    fi
    
    # Restore Gemfile if exists (for iOS/Android)
    if [ -f "$source_dir/Gemfile" ]; then
        cp "$source_dir/Gemfile" "$target_dir/Gemfile"
        echo "   ✅ Restored Gemfile"
    fi
    
    # Restore Gemfile.lock if exists
    if [ -f "$source_dir/Gemfile.lock" ]; then
        cp "$source_dir/Gemfile.lock" "$target_dir/Gemfile.lock"
        echo "   ✅ Restored Gemfile.lock"
    fi
    
    # Restore Matchfile for iOS
    if [ "$platform" == "ios" ] && [ -f "$source_dir/fastlane/Matchfile" ]; then
        echo "   ✅ Restored Matchfile (iOS)"
    fi
    
    echo ""
}

# Restore iOS configuration
if [ -d "$IOS_DIR" ]; then
    restore_platform "ios"
else
    echo "⚠️  Warning: ios/ directory not found. Run 'expo prebuild' first."
    echo ""
fi

# Restore Android configuration
if [ -d "$ANDROID_DIR" ]; then
    restore_platform "android"
else
    echo "⚠️  Warning: android/ directory not found. Run 'expo prebuild' first."
    echo ""
fi

echo "✅ Fastlane restoration complete!"
echo ""

# Check if running in non-interactive mode (CI/CD)
if [ -t 0 ] && [ -z "$CI" ]; then
    # Interactive mode - ask user
    read -p "📦 Do you want to install bundle dependencies? (y/n) " -n 1 -r
    echo ""
    INSTALL_DEPS=$REPLY
else
    # Non-interactive mode - skip installation (can be overridden with env var)
    INSTALL_DEPS=${INSTALL_BUNDLE_DEPS:-n}
fi

if [[ $INSTALL_DEPS =~ ^[Yy]$ ]]; then
    # Install iOS dependencies
    if [ -d "$IOS_DIR" ] && [ -f "$IOS_DIR/Gemfile" ]; then
        echo ""
        echo "📦 Installing iOS bundle dependencies..."
        cd "$IOS_DIR"
        bundle install
        cd "$SCRIPT_DIR"
    fi
    
    # Install Android dependencies
    if [ -d "$ANDROID_DIR" ] && [ -f "$ANDROID_DIR/Gemfile" ]; then
        echo ""
        echo "📦 Installing Android bundle dependencies..."
        cd "$ANDROID_DIR"
        bundle install
        cd "$SCRIPT_DIR"
    fi
else
    echo ""
    echo "💡 To install bundle dependencies later, run:"
    echo "   cd ios && bundle install"
    echo "   cd android && bundle install"
fi

echo ""
echo "📋 Next steps:"
echo "   1. Review restored .env files and update if needed"
echo "   2. You can now run fastlane commands:"
echo "      - npm run fastlane:ios:staging"
echo "      - npm run fastlane:android:staging"
echo ""

