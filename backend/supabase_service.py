import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY")

supabase_client: Client | None = None

if SUPABASE_URL and SUPABASE_KEY:
    supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)

class SupabaseService:
    def __init__(self, bucket_name: str = "media-cache"):
        self.client = supabase_client
        self.bucket_name = bucket_name
        
    def upload_file_bytes(self, file_path: str, file_bytes: bytes, content_type: str = "image/png") -> str | None:
        """
        Uploads file bytes to Supabase storage and returns the public URL.
        file_path: The path in the bucket, e.g. "images/block_123.png"
        """
        if not self.client:
            print("Supabase client not initialized. Cannot upload to Supabase.")
            return None
            
        try:
            # Check if file exists to prevent duplicate upload errors if desired
            # But normally we just upload/upsert
            res = self.client.storage.from_(self.bucket_name).upload(
                path=file_path,
                file=file_bytes,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            
            # Get public URL
            public_url = self.client.storage.from_(self.bucket_name).get_public_url(file_path)
            return public_url
        except Exception as e:
            print(f"Failed to upload to Supabase: {e}")
            raise e
