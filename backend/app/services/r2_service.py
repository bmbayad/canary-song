import boto3
from app.core.config import settings


class R2Service:
    def __init__(self):
        self.bucket_name = settings.r2_bucket_name
        self.account_id = settings.r2_account_id
        self.access_key = settings.r2_access_key_id
        self.secret_key = settings.r2_secret_access_key
        self.endpoint_url = settings.r2_endpoint_url

        self.s3_client = boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name="auto",
        )

    def generate_presigned_upload_url(
        self, storage_key: str, expiration: int = 3600
    ) -> str:
        """
        Generate a presigned URL for direct upload to R2.

        Args:
            storage_key: S3-style key path in R2
            expiration: URL expiration time in seconds (default 1 hour)

        Returns:
            Presigned URL for PUT request
        """
        try:
            url = self.s3_client.generate_presigned_url(
                "put_object",
                Params={"Bucket": self.bucket_name, "Key": storage_key},
                ExpiresIn=expiration,
            )
            return url
        except Exception as e:
            raise Exception(f"Failed to generate presigned URL: {str(e)}")

    def generate_presigned_download_url(
        self, storage_key: str, expiration: int = 3600
    ) -> str:
        """
        Generate a presigned URL for direct download from R2.

        Args:
            storage_key: S3-style key path in R2
            expiration: URL expiration time in seconds (default 1 hour)

        Returns:
            Presigned URL for GET request
        """
        try:
            url = self.s3_client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket_name, "Key": storage_key},
                ExpiresIn=expiration,
            )
            return url
        except Exception as e:
            raise Exception(f"Failed to generate presigned download URL: {str(e)}")

    def delete_object(self, storage_key: str) -> bool:
        """
        Delete an object from R2.

        Args:
            storage_key: S3-style key path in R2

        Returns:
            True if successful
        """
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=storage_key)
            return True
        except Exception as e:
            raise Exception(f"Failed to delete object from R2: {str(e)}")

    def object_exists(self, storage_key: str) -> bool:
        """Check if an object exists in R2."""
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=storage_key)
            return True
        except self.s3_client.exceptions.NoSuchKey:
            return False
        except Exception as e:
            from botocore.exceptions import ClientError
            if isinstance(e, ClientError) and e.response['Error']['Code'] == '404':
                return False
            raise Exception(f"Failed to check object existence: {str(e)}")


def get_r2_service() -> R2Service:
    return R2Service()
