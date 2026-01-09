#!/bin/bash

# Script to backup fastlane configuration and .env files to distribute/
# Run this script before expo prebuild to backup your fastlane setup

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DISTRIBUTE_DIR="$SCRIPT_DIR/distribute"
IOS_DIR="$SCRIPT_DIR/ios"
ANDROID_DIR="$SCRIPT_DIR/android"

echo "💾 Backing up Fastlane configuration to distribute/"
echo "=================================================="
echo ""

# Create distribute directory if it doesn't exist
mkdir -p "$DISTRIBUTE_DIR"

# Function to backup files for a platform
backup_platform() {
    local platform=$1
    local source_dir="$SCRIPT_DIR/$platform"
    local target_dir="$DISTRIBUTE_DIR/$platform"
    
    if [ ! -d "$source_dir" ]; then
        echo "⚠️  Warning: $platform/ directory not found, skipping backup"
        return
    fi
    
    echo "📦 Backing up $platform configuration..."
    
    # Create target directory
    mkdir -p "$target_dir"
    
    # Backup .env file
    if [ -f "$source_dir/.env" ]; then
        cp "$source_dir/.env" "$target_dir/.env"
        echo "   ✅ Backed up .env"
    else
        echo "   ⚠️  No .env file found to backup"
    fi
    
    # Backup .env.local if exists
    if [ -f "$source_dir/.env.local" ]; then
        cp "$source_dir/.env.local" "$target_dir/.env.local"
        echo "   ✅ Backed up .env.local"
    fi
    
    # Backup fastlane directory
    if [ -d "$source_dir/fastlane" ]; then
        mkdir -p "$target_dir/fastlane"
        
        # Copy all fastlane files (exclude generated files)
        rsync -av --exclude='report.xml' --exclude='*.log' --exclude='.DS_Store' \
            "$source_dir/fastlane/" "$target_dir/fastlane/"
        echo "   ✅ Backed up fastlane/ directory"
        
        # List backed up files
        echo "   📋 Backed up files:"
        find "$source_dir/fastlane" -type f ! -name "report.xml" ! -name "*.log" ! -name ".DS_Store" -exec basename {} \; | sed 's/^/      - /'
    else
        echo "   ⚠️  No fastlane directory found to backup"
    fi
    
    # Backup Gemfile if exists
    if [ -f "$source_dir/Gemfile" ]; then
        cp "$source_dir/Gemfile" "$target_dir/Gemfile"
        echo "   ✅ Backed up Gemfile"
    fi
    
    # Backup Gemfile.lock if exists
    if [ -f "$source_dir/Gemfile.lock" ]; then
        cp "$source_dir/Gemfile.lock" "$target_dir/Gemfile.lock"
        echo "   ✅ Backed up Gemfile.lock"
    fi
    
    echo ""
}

# Backup iOS configuration
backup_platform "ios"

# Backup Android configuration
backup_platform "android"

echo "✅ Fastlane backup complete!"
echo ""
echo "📋 Backup location: $DISTRIBUTE_DIR"
echo ""
echo "💡 After running 'expo prebuild', restore with:"
echo "   ./restore-fastlane.sh"
echo "   or"
echo "   npm run restore:fastlane"
echo ""

