const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for larger requests

// Add response caching middleware
const responseCache = new Map();
const CACHE_TTL = 3600000; // Cache TTL: 1 hour

function cacheMiddleware(req, res, next) {
  // Only cache POST requests to specific endpoints
  if (req.method !== 'POST') return next();
  
  const endpoint = req.path;
  if (!['/api/extract-product', '/api/generate-outfit'].includes(endpoint)) return next();
  
  // Create a cache key from the request body
  const cacheKey = `${endpoint}:${JSON.stringify(req.body)}`;
  
  // Check if we have a cached response
  const cachedResponse = responseCache.get(cacheKey);
  if (cachedResponse) {
    console.log(`Cache hit for ${endpoint}`);
    return res.json(cachedResponse);
  }
  
  // Store the original JSON method
  const originalJson = res.json;
  
  // Override the res.json method to cache the response
  res.json = function(data) {
    // Store in cache if successful
    if (data.success) {
      responseCache.set(cacheKey, data);
      
      // Set cache expiration
      setTimeout(() => {
        responseCache.delete(cacheKey);
      }, CACHE_TTL);
      
      console.log(`Cached response for ${endpoint}`);
    }
    
    // Call the original method
    return originalJson.call(this, data);
  };
  
  next();
}

// Use the caching middleware
app.use(cacheMiddleware);

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
        temperature: 0.3,
        max_tokens: 500 // Limit token usage for faster responses
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

// Modified outfit generation endpoint with optimizations
app.post('/api/generate-outfit', async (req, res) => {
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
    
    // Forward the request to OpenAI with optimized parameters
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional fashion stylist who creates outfit recommendations based on available wardrobe items. Be concise and respond only with the required JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5, // Slightly lower temperature for more consistent responses
        max_tokens: 800, // Limit token usage for faster responses
        presence_penalty: 0.1, // Slight penalty to avoid repetitive responses
        frequency_penalty: 0.1 // Slight penalty to avoid repetitive responses
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        timeout: 15000 // 15 second timeout for faster error recovery
      }
    );
    
    // Return the OpenAI response to the client
    return res.json({
      success: true,
      result: response.data.choices[0]?.message?.content || ''
    });
    
  } catch (error) {
    console.error('Error in outfit generation:', error);
    
    // Return error details
    return res.status(500).json({
      success: false,
      error: error.response?.data?.error?.message || error.message || 'Unknown error'
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});