// ai-product-extractor.js
// This file will be included in the public directory of your extension
console.log('AI Product Extractor loaded');

class AIProductExtractor {
  constructor() {
    this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-3.5-turbo'; // Using a faster, cheaper model since we're just extracting info
    
    // Initialize
    this.isEnabled = true;
    this.debugMode = false;
  }
  
  // Extract all visible text from a page
  extractVisibleText() {
    try {
      // Get all text nodes that are visible
      const textNodes = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            // Skip if parent is hidden
            const style = window.getComputedStyle(node.parentElement);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Skip if empty
            if (node.nodeValue.trim() === '') {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Skip if in a script or style tag
            const parentTag = node.parentElement.tagName.toLowerCase();
            if (parentTag === 'script' || parentTag === 'style' || parentTag === 'noscript') {
              return NodeFilter.FILTER_REJECT;
            }
            
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      
      while (walker.nextNode()) {
        textNodes.push(walker.currentNode.nodeValue.trim());
      }
      
      // Special handling for meta tags (often contain good descriptions)
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription && metaDescription.content) {
        textNodes.push('META DESCRIPTION: ' + metaDescription.content);
      }
      
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription && ogDescription.content) {
        textNodes.push('OG DESCRIPTION: ' + ogDescription.content);
      }
      
      // Get the title 
      const title = document.title;
      textNodes.unshift('PAGE TITLE: ' + title);
      
      // Get current URL
      textNodes.unshift('PAGE URL: ' + window.location.href);
      
      // Get h1, h2 elements (typically contain product names)
      const headings = [...document.querySelectorAll('h1, h2')].map(h => h.innerText.trim());
      if (headings.length > 0) {
        textNodes.unshift('HEADINGS: ' + headings.join(' | '));
      }
      
      // Join all text
      return textNodes.join('\n').trim();
    } catch (error) {
      console.error('Error extracting visible text:', error);
      return '';
    }
  }
  
  // Extract product data using AI
  async extractProductDataWithAI(imageUrl) {
    try {
      // Get page text
      const pageText = this.extractVisibleText();
      
      if (this.debugMode) {
        console.log('Extracted text:', pageText.substring(0, 500) + '...');
      }
      
      if (!pageText) {
        return {
          success: false,
          error: 'No visible text found on page'
        };
      }
      
      // Prepare prompt
      const prompt = this.constructPrompt(pageText, imageUrl);
      
      // Send to OpenAI through background script (avoid CORS issues)
      const response = await this.sendToBackground({
        action: 'extractProductDataWithAI',
        prompt: prompt,
        imageUrl: imageUrl,
        url: window.location.href
      });
      
      if (response && response.success && response.productData) {
        if (this.debugMode) {
          console.log('AI extracted product data:', response.productData);
        }
        return {
          success: true,
          productData: response.productData
        };
      } else {
        throw new Error(response?.error || 'Failed to extract product data');
      }
    } catch (error) {
      console.error('Error in AI extraction:', error);
      return {
        success: false,
        error: error.message || 'Unknown error in AI extraction'
      };
    }
  }
  
  // Send message to background script
  sendToBackground(message) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // Construct a prompt for the AI
  constructPrompt(pageText, imageUrl) {
    // Truncate if too long (API limit and cost concerns)
    const maxLength = 6000; // Reasonable limit for the amount of text
    const truncatedText = pageText.length > maxLength 
      ? pageText.substring(0, maxLength) + '...(truncated)'
      : pageText;
    
    return `
You are an AI assistant specialized in extracting product information from e-commerce websites. 
I need you to analyze the following text from a product page and extract structured product information.
Focus specifically on clothing or accessory product details.

Extract the following information in JSON format:
1. title: The name of the product
2. brand: The brand name if available
3. price: The price with currency symbol if available
4. originalPrice: If there's a sale, the original price before discount
5. color: The color of the product if mentioned
6. description: A concise description of the product (max 200 characters)
7. detailedDescription: A more complete description with features, material, etc. (max 1000 characters)
8. material: The fabric/material composition if available
9. category: Identify which category this belongs to: tops, bottoms, dresses, outerwear, shoes, accessories, or other

IMPORTANT: The image URL associated with this product is: ${imageUrl}
Respond ONLY with valid JSON without any other text or explanations.
If you can't determine a specific field, use null for that field.

Here is the webpage content:
${truncatedText}
`;
  }
  
  // For testing the extraction manually
  async testExtraction() {
    const result = await this.extractProductDataWithAI(window.location.href);
    console.log('Test extraction result:', result);
    return result;
  }
}

// Create global instance
window.aiProductExtractor = new AIProductExtractor();

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractProductWithAI' && message.imageUrl) {
    console.log('Received request to extract product data for image:', message.imageUrl);
    
    window.aiProductExtractor.extractProductDataWithAI(message.imageUrl)
      .then(result => {
        console.log('AI extraction result:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('Error in AI extraction:', error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Unknown error in AI extraction'
        });
      });
    
    return true; // Will respond asynchronously
  }
});

console.log('AI Product Extractor initialized and ready');