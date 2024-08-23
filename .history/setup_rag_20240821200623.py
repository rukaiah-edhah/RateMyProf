from dotenv import load_dotenv
load_dotenv()
from pinecone import Pinecone, ServerlessSpec
from openai import OpenAI
import os
import json


'''

This script will:
- Load environment variables
- Initialize Pinecone
- Create a new Pinecone index named “rag”
- Load review data from `reviews.json`
- Create embeddings for each review using Gemeni's API
- Insert these embeddings into the Pinecone index
- Print the number of upserted vectors and index statistics

This setup creates the foundation for your RAG system by embedding the review data 
and storing it in a vector database (Pinecone), which can later be queried to 
provide relevant information for the AI assistant.

'''

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

# Create a Pinecone index
pc.create_index(
    name="rag",
    dimension=1536,
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
)

# Load the review data
data = json.load(open("reviews.json"))

processed_data = []
client = OpenAI()

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
index = pc.Index("rag")
upsert_response = index.upsert(
    vectors=processed_data,
    namespace="ns1",
)
print(f"Upserted count: {upsert_response['upserted_count']}")

# Print index statistics
print(index.describe_index_stats())