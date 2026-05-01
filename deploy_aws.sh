#!/bin/bash
# AEGIS AWS Deployment Script
# This script automates the process of pushing images to ECR.

set -e

REGION="ap-south-1"
APP_NAME="aegis"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "--- Deploying AEGIS to AWS ($REGION) ---"

# 1. Create ECR Repositories if they don't exist
for repo in "api" "frontend" "worker"; do
    aws ecr describe-repositories --repository-names "${APP_NAME}-${repo}" --region ${REGION} --no-cli-pager || \
    aws ecr create-repository --repository-name "${APP_NAME}-${repo}" --region ${REGION} --no-cli-pager
done

# 2. Login to ECR
aws ecr get-login-password --region ${REGION} --no-cli-pager | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

# 3. Build and Push Images
# API
echo "Building API..."
docker build -t ${APP_NAME}-api -f Dockerfile.api .
docker tag ${APP_NAME}-api:latest ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${APP_NAME}-api:latest
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${APP_NAME}-api:latest

# Frontend
echo "Building Frontend..."
docker build -t ${APP_NAME}-frontend -f Dockerfile.frontend .
docker tag ${APP_NAME}-frontend:latest ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${APP_NAME}-frontend:latest
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${APP_NAME}-frontend:latest

# Worker
echo "Building Worker..."
docker build -t ${APP_NAME}-worker -f Dockerfile.worker .
docker tag ${APP_NAME}-worker:latest ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${APP_NAME}-worker:latest
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${APP_NAME}-worker:latest

echo "--- All images pushed to ECR! ---"
echo "Next steps:"
echo "1. Create an ECS Cluster in the AWS Console."
echo "2. Create Task Definitions using these ECR image URLs."
echo "3. Configure your Environment Variables (S3_BUCKET, DATABASE_URL, etc.) in the Task Definition."
