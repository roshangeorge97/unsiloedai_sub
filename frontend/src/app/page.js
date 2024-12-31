"use client"

import { useState } from 'react';
import { Container, Box, Button, TextField, Typography, Paper, CircularProgress } from '@mui/material';

export default function Home() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const handleFileUpload = async (event) => {
    const uploadedFiles = Array.from(event.target.files);
    setLoading(true);
    setError('');
    
    try {
      for (const file of uploadedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('http://localhost:8000/upload/', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Upload failed');
        }
        
        const result = await response.json();
        console.log('Upload response:', result);
        setFiles(prev => [...prev, file.name]);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(`Upload failed: ${error.message}`);
    }
    
    setLoading(false);
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setMessages(prev => [...prev, { type: 'user', content: query }]);
    setLoading(true);
    setError('');

    try {
      console.log('Sending query:', query);
      const response = await fetch('http://localhost:8000/query/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Query failed');
      }

      const data = await response.json();
      console.log('Query response:', data);
      
      if (!data.answer) {
        throw new Error('No answer received from server');
      }
      
      setMessages(prev => [...prev, {
        type: 'bot',
        content: data.answer,
        sources: data.sources
      }]);
    } catch (error) {
      console.error('Error querying:', error);
      setError(`Query failed: ${error.message}`);
      setMessages(prev => [...prev, {
        type: 'bot',
        content: `Error: ${error.message}`
      }]);
    } finally {
      setLoading(false);
      setQuery('');
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        bgcolor: '#f0f4f8',  // Light blue-gray background
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Container 
        maxWidth={false} 
        sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          py: 2,
          px: { xs: 2, sm: 4 },
          maxWidth: '1200px',
          margin: '0 auto',
          height: '100vh'
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2
        }}>
          <Typography 
            variant="h5" 
            sx={{
              color: '#334155',
              fontWeight: 600,
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}
          >
            PDF Q&A System
          </Typography>
          
          <Button
            variant="contained"
            component="label"
            disabled={loading}
            sx={{
              bgcolor: '#3b82f6',
              '&:hover': {
                bgcolor: '#2563eb',
              },
              textTransform: 'none',
              boxShadow: 'none',
              borderRadius: '8px',
              px: 3
            }}
          >
            Upload PDFs
            <input
              type="file"
              hidden
              multiple
              accept=".pdf"
              onChange={handleFileUpload}
            />
          </Button>
        </Box>

        {error && (
          <Paper 
            elevation={0}
            sx={{ 
              p: 2,
              mb: 2,
              bgcolor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px'
            }}
          >
            {error}
          </Paper>
        )}

        {files.length > 0 && (
          <Paper 
            elevation={0}
            sx={{ 
              p: 1.5,
              mb: 2,
              bgcolor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}
          >
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {files.join(', ')}
            </Typography>
          </Paper>
        )}

        <Box 
          sx={{ 
            flex: 1,
            bgcolor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          <Box 
            sx={{ 
              flex: 1,
              overflowY: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column-reverse'
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {messages.map((message, index) => (
                <Paper 
                  key={index}
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: message.type === 'user' ? '#f8fafc' : '#ffffff',
                    border: '1px solid',
                    borderColor: message.type === 'user' ? '#e2e8f0' : '#f1f5f9',
                    borderRadius: '8px',
                    maxWidth: '85%',
                    alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start'
                  }}
                >
                  <Typography sx={{ color: '#334155', lineHeight: 1.6 }}>
                    {message.content}
                  </Typography>
                  {message.sources && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block', 
                        mt: 1,
                        color: '#64748b'
                      }}
                    >
                      Sources: {message.sources.map(s => `${s.filename} (Page ${s.page})`).join(', ')}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Box>
          </Box>

          <Box 
            component="form" 
            onSubmit={handleQuery}
            sx={{ 
              p: 2, 
              borderTop: '1px solid #e2e8f0',
              bgcolor: '#ffffff'
            }}
          >
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question..."
                disabled={loading || files.length === 0}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#f8fafc',
                    borderRadius: '8px',
                    '& fieldset': {
                      borderColor: '#e2e8f0',
                    },
                    '&:hover fieldset': {
                      borderColor: '#94a3b8',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#3b82f6',
                    },
                  }
                }}
                size="small"
              />
              <Button 
                type="submit"
                variant="contained"
                disabled={loading || files.length === 0 || !query.trim()}
                sx={{
                  bgcolor: '#3b82f6',
                  '&:hover': {
                    bgcolor: '#2563eb',
                  },
                  boxShadow: 'none',
                  borderRadius: '8px',
                  textTransform: 'none',
                  px: 3,
                  minWidth: '80px'
                }}
              >
                {loading ? (
                  <CircularProgress size={20} sx={{ color: '#ffffff' }} />
                ) : (
                  'Ask'
                )}
              </Button>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}