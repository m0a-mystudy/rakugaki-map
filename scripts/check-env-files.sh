#!/bin/bash

# Check for potential credential files in git staging area

echo "🔍 Checking for environment files with credentials..."

# Check if .env.local is in git index (staged for commit)
if git ls-files --error-unmatch .env.local >/dev/null 2>&1; then
    echo "❌ .env.local is tracked by git!"
    echo "Remove it with: git rm --cached .env.local"
    exit 1
fi

# Check for any staged .env files that might contain credentials
staged_env_files=$(git diff --cached --name-only | grep -E "\.env" | grep -v "\.env\.example")

if [ -n "$staged_env_files" ]; then
    echo "❌ Found .env files staged for commit:"
    echo "$staged_env_files"
    echo ""
    echo "Please ensure these files are in .gitignore and not committed!"
    echo "Use .env.example for templates instead."
    exit 1
fi

echo "✅ No credential files detected in staged changes"
exit 0
