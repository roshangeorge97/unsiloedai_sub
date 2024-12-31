# PDF Question-Answering System

An interactive system for querying PDF documents using AI. Built with FastAPI, Next.js, and vector database technology.

## Features

### Backend
- PDF processing and text extraction
- Embedding generation and vector storage
- Context-aware question answering with citations
- Multi-file upload support (20-30 pages per PDF)
- FastAPI endpoints for file handling and QA
- Vector database integration for efficient retrieval

### Frontend
- Modern chat interface built with Next.js
- Real-time conversation history
- PDF upload with progress tracking
- Citation display with page references
- Responsive design for all devices

## Setup

### Prerequisites
- Python 3.8+
- Node.js 14+
- Gemini API key

### Backend Installation

1. Create and activate virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```


3. Create .env in backend directory

```bash
GOOGLE_API_KEY=your_actual_gemini_api_key_here
```

4. Start server:

```bash
python main.py
```

### Frontend Installation

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start development server:

```bash
npm run dev
```

### Project Structure

```bash
pdf-qa-system/
├── backend/
│   ├── main.py          # FastAPI application
│   └── chroma_db/             # Vector database storage
├── frontend/
│   ├── src/app/          # Next.js pages
└── README.md
```


### API Endpoints

- POST /upload: PDF file upload
- POST /query: Question answering
- GET /documents: List processed documents

### Usage

- Access web interface at http://localhost:3000
- Upload PDFs using the upload button
- Wait for processing completion
- Ask questions in the chat interface
- View AI-generated answers with page citations

### Error Handling

- Maximum file size: 50MB
- Supported formats: PDF only
- Automatic retry for failed uploads
- Error messages for invalid queries

Development

- Run tests: pytest (backend) or npm test (frontend)
- Format code: black . (backend) or npm run format (frontend)
- Check linting: flake8 (backend) or npm run lint (frontend)