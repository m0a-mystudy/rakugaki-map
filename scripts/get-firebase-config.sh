#!/bin/bash

# Script to get Firebase configuration and output it in Terraform-compatible format
# Usage: ./get-firebase-config.sh <project-id>

set -e

PROJECT_ID=$1

if [ -z "$PROJECT_ID" ]; then
    echo "Usage: $0 <project-id>"
    exit 1
fi

# Getting Firebase configuration for project: $PROJECT_ID

# Set the Firebase project
firebase use "$PROJECT_ID" >/dev/null 2>&1 || {
    echo "Error: Could not set Firebase project to $PROJECT_ID"
    echo "Make sure you have Firebase CLI installed and the project exists"
    exit 1
}

# Get the web app config
CONFIG=$(firebase apps:sdkconfig web --project "$PROJECT_ID" 2>/dev/null) || {
    echo "Error: Could not get Firebase web app config"
    echo "Make sure you have a web app configured in your Firebase project"
    exit 1
}

# Parse the config and output as environment variables
echo "$CONFIG" | grep -E "(apiKey|authDomain|projectId|storageBucket|messagingSenderId|appId)" | while IFS= read -r line; do
    # Remove quotes and whitespace
    line=$(echo "$line" | sed 's/[",]//g' | sed 's/^[[:space:]]*//')

    # Convert to environment variable format
    case "$line" in
        *apiKey:*)
            echo "TF_VAR_firebase_api_key=$(echo "$line" | cut -d: -f2 | sed 's/^[[:space:]]*//')"
            ;;
        *authDomain:*)
            echo "TF_VAR_firebase_auth_domain=$(echo "$line" | cut -d: -f2 | sed 's/^[[:space:]]*//')"
            ;;
        *storageBucket:*)
            echo "TF_VAR_firebase_storage_bucket=$(echo "$line" | cut -d: -f2 | sed 's/^[[:space:]]*//')"
            ;;
        *messagingSenderId:*)
            echo "TF_VAR_firebase_messaging_sender_id=$(echo "$line" | cut -d: -f2 | sed 's/^[[:space:]]*//')"
            ;;
        *appId:*)
            echo "TF_VAR_firebase_app_id=$(echo "$line" | cut -d: -f2 | sed 's/^[[:space:]]*//')"
            ;;
    esac
done

# To use these values in Terraform, run:
# source <(./get-firebase-config.sh $PROJECT_ID)
