import os
import boto3
from botocore.exceptions import NoCredentialsError
import logging

logger = logging.getLogger(__name__)

# Config from environment
S3_BUCKET = os.getenv("AWS_S3_BUCKET")
S3_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")

s3_client = None
if AWS_ACCESS_KEY and AWS_SECRET_KEY:
    s3_client = boto3.client(
        "s3",
        region_name=S3_REGION,
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
    )

def upload_to_s3(local_path: str, s3_key: str) -> str:
    """
    Uploads a file to S3 and returns the public URL (or S3 URI).
    If S3 is not configured, returns the local path as a fallback.
    """
    if not s3_client or not S3_BUCKET:
        logger.warning("[S3] S3 not configured, using local path.")
        return f"file://{local_path}"

    try:
        s3_client.upload_file(local_path, S3_BUCKET, s3_key)
        url = f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{s3_key}"
        logger.info(f"[S3] Uploaded {local_path} to {url}")
        return url
    except Exception as e:
        logger.error(f"[S3] Upload failed: {e}")
        return f"file://{local_path}"

def get_s3_url(s3_key: str) -> str:
    if S3_BUCKET:
        return f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{s3_key}"
    return s3_key
