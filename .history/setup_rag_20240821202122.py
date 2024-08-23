from dotenv import load_dotenv
load_dotenv()
import pinecone
from gemini import Gemini
import os
import json

# Initialize Pinecone
pinecone.init(api_key=os.getenv("PINECONE_API_KEY"))

# Create a Pinecone index
pinecone.create_index(
    name="rag",
    dimension=1536,
    metric="cosine",
    metadata_config={
        "cloud": "aws",
        "region": "us-east-1"
    }
)

# Load the review data
data = json.load(open("reviews.json"))

processed_data = []
client = Gemini(auto_cookies=True)

# Create embeddings for each review
for review in data["reviews"]:
    response = client.embeddings.create(
        input=review['review'], model="text-embedding-3-small"
    )
    embedding = response.data[0].embedding
    processed_data.append(
        {
            "values": embedding,
            "id": review["professor"],
            "metadata":{
                "review": review["review"],
                "subject": review["subject"],
                "stars": review["stars"],
            }
        }
    )

# Insert the embeddings into the Pinecone index
index = pinecone.Index("rag")
upsert_response = index.upsert(
    vectors=processed_data,
    namespace="ns1",
)
print(f"Upserted count: {upsert_response['upserted_count']}")

# Print index statistics
print(index.describe_index_stats())
