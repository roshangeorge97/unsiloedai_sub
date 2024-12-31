# backend/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn
import fitz  # PyMuPDF
import os
from sentence_transformers import SentenceTransformer
import chromadb
from dotenv import load_dotenv
import google.generativeai as genai
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Load environment variables
load_dotenv()

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)

app = FastAPI(title="PDF QA System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize sentence transformer model
model = SentenceTransformer('all-MiniLM-L6-v2')

# Initialize ChromaDB with the new approach
try:
    chroma_client = chromadb.PersistentClient(path="./chroma_db")
    # Create or get collection
    collection = chroma_client.get_or_create_collection(
        name="pdf_documents",
        metadata={"hnsw:space": "cosine"}  # Using cosine similarity
    )
except Exception as e:
    print(f"Error initializing ChromaDB: {str(e)}")
    raise

class QueryRequest(BaseModel):
    query: str

def extract_text_from_pdf(file_path: str) -> List[dict]:
    """
    Extract text from PDF file with page numbers.
    """
    try:
        doc = fitz.open(file_path)
        texts = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text().strip()
            if text:  # Only add pages with content
                texts.append({
                    "text": text,
                    "page": page_num + 1
                })
        return texts
    except Exception as e:
        raise Exception(f"Error extracting text from PDF: {str(e)}")

def get_gemini_response(query: str, context: str) -> str:
    """
    Generate response using Google's Gemini model.
    """
    try:
        model = genai.GenerativeModel('gemini-pro')
        prompt = f"""Based on the following context, answer the question. Include relevant page numbers in your response.
        
        Context:
        {context}
        
        Question: {query}
        
        Please provide a clear and concise answer with specific citations to page numbers when referencing information."""

        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        raise Exception(f"Error generating response from Gemini: {str(e)}")

@app.post("/upload/")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload and process a PDF file.
    """
    file_path = None
    try:
        # Save uploaded file temporarily
        file_path = f"temp_{file.filename}"
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Extract text from PDF
        texts = extract_text_from_pdf(file_path)
        
        # Generate embeddings and store in ChromaDB
        for text_item in texts:
            embedding = model.encode(text_item["text"]).tolist()
            
            # Add to ChromaDB with unique ID
            collection.add(
                documents=[text_item["text"]],
                metadatas=[{
                    "page": text_item["page"],
                    "filename": file.filename
                }],
                embeddings=[embedding],
                ids=[f"{file.filename}_page_{text_item['page']}"]
            )
        
        return {"message": f"PDF '{file.filename}' processed successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temporary file
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.post("/query/")
async def query_documents(query: QueryRequest):
    """
    Query the processed documents and generate a response.
    """
    try:
        logger.info(f"Received query: {query.query}")
        
        # Generate query embedding
        query_embedding = model.encode(query.query).tolist()
        logger.info("Generated embedding")
        
        # Search in ChromaDB
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=3
        )
        logger.info(f"Found {len(results['documents'][0])} relevant documents")
        
        if not results['documents'] or len(results['documents'][0]) == 0:
            logger.warning("No documents found in ChromaDB")
            return {
                "answer": "No relevant information found in the documents. Please make sure you've uploaded PDF files first.",
                "sources": []
            }
        
        # Format context for Gemini
        context = ""
        for i, doc in enumerate(results["documents"][0]):
            page = results["metadatas"][0][i]["page"]
            filename = results["metadatas"][0][i]["filename"]
            context += f"\nFrom {filename}, Page {page}:\n{doc}\n"
        
        logger.info("Sending request to Gemini")
        answer = get_gemini_response(query.query, context)
        logger.info("Received response from Gemini")
        
        return {
            "answer": answer,
            "sources": [{"page": meta["page"], "filename": meta["filename"]}  
                       for meta in results["metadatas"][0]]
        }
        
    except Exception as e:
        logger.error(f"Error in query endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
@app.get("/health")
async def health_check():
    """Check if the service is running."""
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)