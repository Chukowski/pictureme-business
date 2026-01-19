#!/bin/bash
# ===========================================
# S3 to Cloudflare R2 Migration Script
# ===========================================
# 
# This script migrates images from AWS S3 to Cloudflare R2
# without losing any data. It uses rclone for efficient sync.
#
# Prerequisites:
# 1. Install rclone: brew install rclone
# 2. Configure S3 credentials (existing)
# 3. Get R2 API credentials from Cloudflare Dashboard
# 4. Create R2 bucket: wrangler r2 bucket create pictureme-media
#
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  S3 to Cloudflare R2 Migration Script${NC}"
echo -e "${GREEN}============================================${NC}"

# Configuration (UPDATE THESE!)
S3_BUCKET="pictureme.now"
R2_BUCKET="pictureme-media"
R2_ACCOUNT_ID="${R2_ACCOUNT_ID:-YOUR_ACCOUNT_ID}"

# Check if rclone is installed
if ! command -v rclone &> /dev/null; then
    echo -e "${YELLOW}Installing rclone...${NC}"
    brew install rclone || {
        echo -e "${RED}Failed to install rclone. Please install manually: brew install rclone${NC}"
        exit 1
    }
fi

# Check if rclone is configured
if ! rclone listremotes | grep -q "s3:"; then
    echo -e "${YELLOW}S3 remote not configured. Setting up...${NC}"
    echo -e "${YELLOW}Please run: rclone config${NC}"
    echo ""
    echo "For S3, choose:"
    echo "  - n) New remote"
    echo "  - Name: s3"
    echo "  - Storage: Amazon S3 Compliant (4)"
    echo "  - Provider: AWS (1)"
    echo "  - env_auth: true (to use AWS credentials from environment)"
    echo ""
    exit 1
fi

if ! rclone listremotes | grep -q "r2:"; then
    echo -e "${YELLOW}R2 remote not configured.${NC}"
    echo ""
    echo "To configure R2 remote, run: rclone config"
    echo ""
    echo "For R2, choose:"
    echo "  - n) New remote"
    echo "  - Name: r2"
    echo "  - Storage: Amazon S3 Compliant (4)"
    echo "  - Provider: Cloudflare R2 (6)"
    echo "  - access_key_id: <your R2 access key>"
    echo "  - secret_access_key: <your R2 secret key>"
    echo "  - endpoint: https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
    echo ""
    exit 1
fi

# Verify buckets exist
echo -e "${YELLOW}Verifying S3 bucket...${NC}"
if ! rclone lsd s3:${S3_BUCKET} &> /dev/null; then
    echo -e "${RED}Cannot access S3 bucket: ${S3_BUCKET}${NC}"
    echo "Please check your AWS credentials and bucket name"
    exit 1
fi
echo -e "${GREEN}✓ S3 bucket accessible${NC}"

echo -e "${YELLOW}Verifying R2 bucket...${NC}"
if ! rclone lsd r2:${R2_BUCKET} &> /dev/null; then
    echo -e "${YELLOW}R2 bucket doesn't exist. Creating...${NC}"
    # Try to create via wrangler
    source ~/.nvm/nvm.sh && nvm use 20 2>/dev/null
    wrangler r2 bucket create ${R2_BUCKET} 2>/dev/null || {
        echo -e "${RED}Cannot access or create R2 bucket: ${R2_BUCKET}${NC}"
        echo "Please create the bucket first via Cloudflare Dashboard"
        exit 1
    }
fi
echo -e "${GREEN}✓ R2 bucket accessible${NC}"

# Count files in S3
echo -e "${YELLOW}Counting files in S3...${NC}"
S3_COUNT=$(rclone size s3:${S3_BUCKET} --json 2>/dev/null | jq -r '.count // 0')
S3_SIZE=$(rclone size s3:${S3_BUCKET} --json 2>/dev/null | jq -r '.bytes // 0')
S3_SIZE_HUMAN=$(numfmt --to=iec-i --suffix=B ${S3_SIZE} 2>/dev/null || echo "${S3_SIZE} bytes")

echo -e "${GREEN}Found ${S3_COUNT} files (${S3_SIZE_HUMAN}) in S3${NC}"

# Confirm before proceeding
echo ""
echo -e "${YELLOW}This will sync ALL files from S3 to R2.${NC}"
echo -e "${YELLOW}This is a non-destructive operation - S3 files will NOT be deleted.${NC}"
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Perform the sync
echo ""
echo -e "${GREEN}Starting migration...${NC}"
echo -e "${YELLOW}This may take a while depending on the amount of data.${NC}"
echo ""

# Dry run first
echo -e "${YELLOW}Performing dry run...${NC}"
rclone sync s3:${S3_BUCKET} r2:${R2_BUCKET} \
    --progress \
    --dry-run \
    --stats-one-line \
    2>&1 | head -20

echo ""
read -p "Proceed with actual sync? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

# Actual sync with progress
echo -e "${GREEN}Syncing files...${NC}"
rclone sync s3:${S3_BUCKET} r2:${R2_BUCKET} \
    --progress \
    --stats 10s \
    --transfers 16 \
    --checkers 32 \
    --fast-list \
    --checksum \
    --log-file=/tmp/rclone-migration.log

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Migration Complete!${NC}"
echo -e "${GREEN}============================================${NC}"

# Verify counts
R2_COUNT=$(rclone size r2:${R2_BUCKET} --json 2>/dev/null | jq -r '.count // 0')
R2_SIZE=$(rclone size r2:${R2_BUCKET} --json 2>/dev/null | jq -r '.bytes // 0')
R2_SIZE_HUMAN=$(numfmt --to=iec-i --suffix=B ${R2_SIZE} 2>/dev/null || echo "${R2_SIZE} bytes")

echo ""
echo -e "S3 bucket:  ${S3_COUNT} files (${S3_SIZE_HUMAN})"
echo -e "R2 bucket:  ${R2_COUNT} files (${R2_SIZE_HUMAN})"

if [ "${S3_COUNT}" == "${R2_COUNT}" ]; then
    echo -e "${GREEN}✓ File counts match!${NC}"
else
    echo -e "${YELLOW}⚠ File counts don't match. Please verify manually.${NC}"
fi

echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Configure R2 public access via Cloudflare Dashboard"
echo "2. Set up custom domain: r2.pictureme.now"
echo "3. Update application environment variables"
echo "4. Test image loading"
echo "5. (Optional) After verification, remove S3 data"
echo ""
echo "Log file: /tmp/rclone-migration.log"
