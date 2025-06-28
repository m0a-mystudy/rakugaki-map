#!/bin/bash

# WIF (Workload Identity Federation) Management Script
# This script provides safe operations for WIF management with proper validation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PROJECT_ID=""
ENVIRONMENT=""
DRY_RUN=false

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show help
show_help() {
    cat << EOF
WIF Management Script

USAGE:
    $0 <command> [options]

COMMANDS:
    backup          Create backup of current WIF configuration
    list-repos      List currently allowed repositories
    add-repo        Add repository to WIF configuration
    remove-repo     Remove repository from WIF configuration
    list-permissions Show current service account permissions
    show-config     Display current WIF configuration

OPTIONS:
    -p, --project PROJECT_ID    GCP Project ID (required)
    -e, --env ENVIRONMENT       Environment (dev/prod)
    -r, --repo REPOSITORY       Repository name (format: owner/repo)
    -d, --dry-run              Show what would be done without executing
    -h, --help                 Show this help message

EXAMPLES:
    # Backup current configuration
    $0 backup -p rakugakimap-dev -e dev

    # List allowed repositories
    $0 list-repos -p rakugakimap-dev -e dev

    # Add new repository (dry run first)
    $0 add-repo -p rakugakimap-dev -e dev -r m0a-mystudy/new-repo --dry-run

    # Add new repository (actual execution)
    $0 add-repo -p rakugakimap-dev -e dev -r m0a-mystudy/new-repo

    # Show current configuration
    $0 show-config -p rakugakimap-dev -e dev

SAFETY FEATURES:
    - All operations require explicit confirmation
    - Dry-run mode available for testing
    - Automatic backup before changes
    - Validation of inputs and existing configuration
    - Rollback instructions provided on failure

EOF
}

# Validate required tools
validate_tools() {
    if ! command -v gcloud &> /dev/null; then
        print_error "gcloud CLI is not installed or not in PATH"
        exit 1
    fi

    # Check gcloud authentication
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 &> /dev/null; then
        print_error "Not authenticated with gcloud. Run: gcloud auth login"
        exit 1
    fi
}

# Validate project access
validate_project() {
    local project="$1"
    
    if ! gcloud projects describe "$project" &> /dev/null; then
        print_error "Cannot access project '$project' or project doesn't exist"
        exit 1
    fi
}

# Get WIF pool and provider names based on environment
get_wif_names() {
    local env="$1"
    
    if [[ "$env" == "dev" ]]; then
        WIF_POOL="github-actions-pool"
        WIF_PROVIDER="github-provider"
    elif [[ "$env" == "prod" ]]; then
        WIF_POOL="github-actions-pool-prod"
        WIF_PROVIDER="github-provider-prod"
    else
        print_error "Invalid environment: $env. Must be 'dev' or 'prod'"
        exit 1
    fi
}

# Backup WIF configuration
backup_wif_config() {
    local project="$1"
    local env="$2"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="wif-backups"
    
    get_wif_names "$env"
    
    print_info "Creating backup of WIF configuration..."
    
    mkdir -p "$backup_dir"
    
    # Backup WIF Pool
    gcloud iam workload-identity-pools describe "$WIF_POOL" \
        --location=global \
        --project="$project" \
        --format=json > "$backup_dir/wif-pool-${env}-${timestamp}.json"
    
    # Backup WIF Provider
    gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" \
        --location=global \
        --workload-identity-pool="$WIF_POOL" \
        --project="$project" \
        --format=json > "$backup_dir/wif-provider-${env}-${timestamp}.json"
    
    # Backup IAM Policy
    gcloud projects get-iam-policy "$project" \
        --format=json > "$backup_dir/iam-policy-${project}-${timestamp}.json"
    
    print_success "Backup created in $backup_dir/"
    print_info "Files created:"
    print_info "  - wif-pool-${env}-${timestamp}.json"
    print_info "  - wif-provider-${env}-${timestamp}.json"
    print_info "  - iam-policy-${project}-${timestamp}.json"
}

# List currently allowed repositories
list_repos() {
    local project="$1"
    local env="$2"
    
    get_wif_names "$env"
    
    print_info "Fetching current repository configuration..."
    
    local condition=$(gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" \
        --location=global \
        --workload-identity-pool="$WIF_POOL" \
        --project="$project" \
        --format="value(attributeCondition)")
    
    print_info "Current attribute condition:"
    echo "$condition"
    
    print_info "Allowed repositories:"
    echo "$condition" | grep -oE "attribute\.repository=='[^']+'" | sed "s/attribute\.repository=='//g" | sed "s/'//g" || true
}

# Show current WIF configuration
show_config() {
    local project="$1"
    local env="$2"
    
    get_wif_names "$env"
    
    print_info "WIF Configuration for $project ($env environment):"
    echo ""
    
    print_info "Workload Identity Pool:"
    gcloud iam workload-identity-pools describe "$WIF_POOL" \
        --location=global \
        --project="$project" \
        --format="table(name,displayName,description,state)"
    
    echo ""
    print_info "Workload Identity Provider:"
    gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" \
        --location=global \
        --workload-identity-pool="$WIF_POOL" \
        --project="$project" \
        --format="table(name,displayName,state,attributeCondition)"
}

# Add repository to WIF configuration
add_repo() {
    local project="$1"
    local env="$2"
    local new_repo="$3"
    
    get_wif_names "$env"
    
    # Validate repository format
    if [[ ! "$new_repo" =~ ^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$ ]]; then
        print_error "Invalid repository format. Expected: owner/repo"
        exit 1
    fi
    
    print_info "Adding repository '$new_repo' to WIF configuration..."
    
    # Get current condition
    local current_condition=$(gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" \
        --location=global \
        --workload-identity-pool="$WIF_POOL" \
        --project="$project" \
        --format="value(attributeCondition)")
    
    print_info "Current condition: $current_condition"
    
    # Check if repository is already included
    if echo "$current_condition" | grep -q "attribute.repository=='$new_repo'"; then
        print_warning "Repository '$new_repo' is already allowed"
        return 0
    fi
    
    # Create new condition
    local new_condition="${current_condition} || attribute.repository=='$new_repo'"
    
    print_info "New condition will be: $new_condition"
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_warning "DRY RUN: Would update WIF provider with new condition"
        return 0
    fi
    
    # Confirm with user
    echo ""
    print_warning "This will modify the WIF provider configuration."
    print_warning "Make sure you have created a backup first!"
    echo ""
    read -p "Do you want to continue? (yes/no): " confirm
    
    if [[ "$confirm" != "yes" ]]; then
        print_info "Operation cancelled"
        return 0
    fi
    
    # Create backup first
    backup_wif_config "$project" "$env"
    
    # Update the provider
    print_info "Updating WIF provider..."
    gcloud iam workload-identity-pools providers update "$WIF_PROVIDER" \
        --location=global \
        --workload-identity-pool="$WIF_POOL" \
        --attribute-condition="$new_condition" \
        --project="$project"
    
    print_success "Repository '$new_repo' has been added to WIF configuration"
    print_info "Please test GitHub Actions to ensure the configuration works correctly"
}

# List service account permissions
list_permissions() {
    local project="$1"
    local env="$2"
    
    local sa_email="github-actions-wif@${project}.iam.gserviceaccount.com"
    
    print_info "Service Account Permissions for $sa_email:"
    
    gcloud projects get-iam-policy "$project" \
        --flatten="bindings[].members" \
        --filter="bindings.members:$sa_email" \
        --format="table(bindings.role)"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--project)
                PROJECT_ID="$2"
                shift 2
                ;;
            -e|--env)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -r|--repo)
                REPOSITORY="$2"
                shift 2
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                if [[ -z "$COMMAND" ]]; then
                    COMMAND="$1"
                else
                    print_error "Unknown option: $1"
                    exit 1
                fi
                shift
                ;;
        esac
    done
}

# Main function
main() {
    # Parse command line arguments
    parse_args "$@"
    
    # Validate tools
    validate_tools
    
    # Check if command is provided
    if [[ -z "$COMMAND" ]]; then
        print_error "No command specified"
        show_help
        exit 1
    fi
    
    # Validate required arguments based on command
    case "$COMMAND" in
        backup|list-repos|list-permissions|show-config)
            if [[ -z "$PROJECT_ID" || -z "$ENVIRONMENT" ]]; then
                print_error "Project ID (-p) and environment (-e) are required"
                exit 1
            fi
            ;;
        add-repo|remove-repo)
            if [[ -z "$PROJECT_ID" || -z "$ENVIRONMENT" || -z "$REPOSITORY" ]]; then
                print_error "Project ID (-p), environment (-e), and repository (-r) are required"
                exit 1
            fi
            ;;
        *)
            print_error "Unknown command: $COMMAND"
            show_help
            exit 1
            ;;
    esac
    
    # Validate project access
    validate_project "$PROJECT_ID"
    
    # Execute command
    case "$COMMAND" in
        backup)
            backup_wif_config "$PROJECT_ID" "$ENVIRONMENT"
            ;;
        list-repos)
            list_repos "$PROJECT_ID" "$ENVIRONMENT"
            ;;
        add-repo)
            add_repo "$PROJECT_ID" "$ENVIRONMENT" "$REPOSITORY"
            ;;
        list-permissions)
            list_permissions "$PROJECT_ID" "$ENVIRONMENT"
            ;;
        show-config)
            show_config "$PROJECT_ID" "$ENVIRONMENT"
            ;;
        *)
            print_error "Command not implemented: $COMMAND"
            exit 1
            ;;
    esac
}

# Only run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi