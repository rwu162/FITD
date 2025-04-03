// public/ai-outfit-service.js
// This file should be saved in the public directory
// This service handles the OpenAI API interactions for outfit generation

console.log('AI Outfit Service loaded');

class AIOutfitService {
  constructor() {
    // Default values for API
    this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-3.5-turbo';
    
    // Load API key from storage
    this.loadApiKey();
    
    // Bind methods
    this.generateOutfit = this.generateOutfit.bind(this);
  }
  
  // Load API key from secure storage
  async loadApiKey() {
    try {
      if (chrome.storage) {
        chrome.storage.local.get('openai_api_key', (data) => {
          this.apiKey = data.openai_api_key || '';
          console.log('API key loaded:', this.apiKey ? 'Key found' : 'No key found');
        });
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  }
  
  // Set a new API key
  async setApiKey(key) {
    this.apiKey = key;
    if (chrome.storage) {
      await chrome.storage.local.set({ 'openai_api_key': key });
      console.log('API key saved');
    }
  }

  // Main method to generate an outfit based on wardrobe items
  async generateOutfit(wardrobeItems, options = {}) {
    try {
      console.log('Generating outfit with options:', options);
      console.log('Available wardrobe items:', wardrobeItems.length);
      
      // Extract categories from wardrobe
      const tops = wardrobeItems.filter(item => item.category === 'tops');
      const bottoms = wardrobeItems.filter(item => item.category === 'bottoms');
      const shoes = wardrobeItems.filter(item => item.category === 'shoes');
      const outerwear = wardrobeItems.filter(item => item.category === 'outerwear');
      const dresses = wardrobeItems.filter(item => item.category === 'dresses');
      const accessories = wardrobeItems.filter(item => item.category === 'accessories');
      const other = wardrobeItems.filter(item => 
        !['tops', 'bottoms', 'shoes', 'outerwear', 'dresses', 'accessories'].includes(item.category)
      );
      
      // Generate a prompt based on available items and user input
      const prompt = this.constructPromptFromUserInput({
        tops, bottoms, shoes, outerwear, dresses, accessories, other,
        userPrompt: options.userPrompt || "Create a casual everyday outfit"
      });
      
      // Make OpenAI API request (now via background script)
      const response = await this.callServerSideAPI(prompt);
      
      // Parse the response to get outfit
      const outfit = this.parseOutfitResponse(response, {
        tops, bottoms, shoes, outerwear, dresses, accessories, other
      });
      
      return {
        success: true,
        outfit: outfit,
        message: 'Outfit generated successfully!'
      };
      
    } catch (error) {
      console.error('Error generating outfit:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate outfit. ' + error.message
      };
    }
  }
  
  // Construct a prompt based on user input
  constructPromptFromUserInput({ tops, bottoms, shoes, outerwear, dresses, accessories, other, userPrompt }) {
    // Create a simplified view of each item to avoid overwhelming the API
    const simplifyItem = (item) => ({
      id: item.addedAt,
      title: item.title || 'Unnamed item',
      brand: item.brand || '',
      color: this.extractColorFromTitle(item.title) || 'unknown',
      description: item.description ? item.description.substring(0, 100) : ''
    });
    
    // Include all available categories
    const allItems = {
      tops: tops.length > 0 ? tops.map(simplifyItem) : [],
      bottoms: bottoms.length > 0 ? bottoms.map(simplifyItem) : [],
      shoes: shoes.length > 0 ? shoes.map(simplifyItem) : [],
      outerwear: outerwear.length > 0 ? outerwear.map(simplifyItem) : [],
      dresses: dresses.length > 0 ? dresses.map(simplifyItem) : [],
      accessories: accessories.length > 0 ? accessories.map(simplifyItem) : [],
      other: other.length > 0 ? other.map(simplifyItem) : []
    };
    
    // Filter out empty categories
    const itemsToInclude = {};
    Object.entries(allItems).forEach(([category, items]) => {
      if (items.length > 0) {
        itemsToInclude[category] = items;
      }
    });
    
    // Create the prompt with user's input
    let prompt = `You are a professional fashion stylist. ${userPrompt}. Create an outfit from the following wardrobe items that meets this request. Select the best matching items that coordinate well together.\n\n`;
    
    // Add items by category
    Object.entries(itemsToInclude).forEach(([category, items]) => {
      prompt += `${category.toUpperCase()} (select 0-1):\n`;
      items.forEach((item, index) => {
        prompt += `${index + 1}. ${item.title} (${item.brand}) - ID: ${item.id}\n`;
      });
      prompt += '\n';
    });
    
    // Add instructions for the response format
    prompt += `Select appropriate items to create a cohesive outfit that matches the request. You can select 0 or 1 item from each category. Respond in JSON format like this:
{
  "outfit": {
    ${Object.keys(itemsToInclude).map(cat => `"${cat}": "ID_OF_SELECTED_ITEM_OR_NULL"`).join(',\n    ')}
  },
  "reasoning": "Brief explanation of why these items work well together and how they fulfill the request"
}`;
    
    console.log('Generated prompt:', prompt);
    return prompt;
  }
  
  // Extract color information from item title or description
  extractColorFromTitle(text) {
    if (!text) return null;
    
    const commonColors = [
      'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 
      'white', 'gray', 'grey', 'brown', 'navy', 'beige', 'maroon', 'teal', 'olive',
      'turquoise', 'lavender', 'cream', 'tan', 'khaki'
    ];
    
    // Convert to lowercase and search for color names
    const lowerText = text.toLowerCase();
    for (const color of commonColors) {
      if (lowerText.includes(color)) {
        return color;
      }
    }
    
    return null;
  }
  
  // Call the OpenAI API via a server-side endpoint
  async callServerSideAPI(prompt) {
    try {
      // Instead of calling OpenAI directly, we'll use the background script as a proxy
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'processAIRequest',
          prompt: prompt
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (response && response.success) {
            console.log('Server response:', response);
            resolve(response.result);
          } else {
            reject(new Error(response?.error || 'Failed to process request'));
          }
        });
      });
    } catch (error) {
      console.error('Error calling server-side API:', error);
      throw error;
    }
  }
  
  // Parse the OpenAI response to get outfit items
  parseOutfitResponse(responseText, itemsByCategory) {
    try {
      // Find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not find JSON in the response');
      }
      
      const jsonStr = jsonMatch[0];
      const outfitData = JSON.parse(jsonStr);
      
      // Validate the outfit data
      if (!outfitData.outfit) {
        throw new Error('Invalid outfit data structure');
      }
      
      // Convert IDs to actual items
      const outfit = {};
      const categories = Object.keys(outfitData.outfit);
      
      for (const category of categories) {
        const itemId = outfitData.outfit[category];
        const items = itemsByCategory[category] || [];
        
        // Find the item with matching ID
        const matchedItem = items.find(item => item.addedAt === itemId);
        
        if (matchedItem) {
          outfit[category] = matchedItem;
        }
      }
      
      return {
        items: outfit,
        reasoning: outfitData.reasoning || 'These items complement each other well.',
        name: `AI Generated ${this.capitalizeFirst(outfitData.outfit.occasion || 'Outfit')}`
      };
      
    } catch (error) {
      console.error('Error parsing outfit response:', error);
      
      // Fallback: Try to create a simple outfit if parsing fails
      return this.createFallbackOutfit(itemsByCategory);
    }
  }
  
  // Create a fallback outfit if parsing fails
  createFallbackOutfit(itemsByCategory) {
    const outfit = {};
    const categories = Object.keys(itemsByCategory);
    
    for (const category of categories) {
      const items = itemsByCategory[category] || [];
      if (items.length > 0) {
        // Just pick the first item in each category
        outfit[category] = items[0];
      }
    }
    
    return {
      items: outfit,
      reasoning: 'This is a simple outfit based on your wardrobe.',
      name: 'Simple Outfit'
    };
  }
  
  // Helper to capitalize first letter
  capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Create and export the service instance
const aiOutfitService = new AIOutfitService();

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'generateOutfit') {
    console.log('Received generate outfit request:', message);
    
    aiOutfitService.generateOutfit(message.wardrobe, message.options)
      .then(result => {
        console.log('Generated outfit result:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('Error:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Indicates we'll respond asynchronously
  }
});

console.log('AI Outfit Service initialized');