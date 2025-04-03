const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// OpenAI API proxy endpoint for product extraction
app.post('/api/extract-product', async (req, res) => {
  try {
    // Get the prompt from the request
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }
    
    // Your API key is securely stored in environment variables
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'API key not configured on the server' 
      });
    }
    
    // Forward the request to OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that extracts product information from e-commerce websites.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    
    // Return the OpenAI response to the client
    return res.json({
      success: true,
      result: response.data.choices[0]?.message?.content || ''
    });
    
  } catch (error) {
    console.error('Error in product extraction:', error);
    
    // Return error details
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Unknown error'
    });
  }
});

// Add a simple health check endpoint
app.get('/', (req, res) => {
  res.send('OpenAI API Proxy Server is running');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});