// public/ai-outfit-service.js - Optimized version
console.log('AI Outfit Service loaded');

class AIOutfitService {
  constructor() {
    // Default values for API
    this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
    this.model = 'gpt-3.5-turbo';
    
    // Add request caching
    this.requestCache = new Map();
    this.CACHE_TTL = 3600000; // 1 hour
    
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
      
      if (!wardrobeItems || wardrobeItems.length === 0) {
        return {
          success: false,
          error: 'No wardrobe items provided',
          message: 'Please add some items to your wardrobe first'
        };
      }
      
      // Create a cache key based on the input
      const cacheKey = JSON.stringify({
        userPrompt: options.userPrompt || "Create a casual everyday outfit",
        wardrobeItems: wardrobeItems.map(item => item.addedAt) // Just use IDs
      });
      
      // Check if we have a cached response
      const cachedResponse = this.requestCache.get(cacheKey);
      if (cachedResponse) {
        console.log('Using cached outfit generation result');
        return cachedResponse;
      }
      
      // Extract categories from wardrobe (limit items per category for performance)
      const MAX_ITEMS = 20; // Limit total items for performance
      
      // Sort items by most recently added
      const sortedItems = [...wardrobeItems].sort((a, b) => {
        return new Date(b.addedAt) - new Date(a.addedAt);
      });
      
      // Take the most recent items (up to MAX_ITEMS)
      const recentItems = sortedItems.slice(0, MAX_ITEMS);
      
      const tops = recentItems.filter(item => item.category === 'tops');
      const bottoms = recentItems.filter(item => item.category === 'bottoms');
      const shoes = recentItems.filter(item => item.category === 'shoes');
      const outerwear = recentItems.filter(item => item.category === 'outerwear');
      const dresses = recentItems.filter(item => item.category === 'dresses');
      const accessories = recentItems.filter(item => item.category === 'accessories');
      
      // Generate a prompt based on available items and user input
      const prompt = this.constructPromptFromUserInput({
        tops, bottoms, shoes, outerwear, dresses, accessories,
        userPrompt: options.userPrompt || "Create a casual everyday outfit"
      });
      
      // Make OpenAI API request (now via background script)
      const response = await this.callServerSideAPI(prompt);
      
      // Parse the response to get outfit
      const outfit = this.parseOutfitResponse(response, {
        tops, bottoms, shoes, outerwear, dresses, accessories
      });
      
      const result = {
        success: true,
        outfit: outfit,
        message: 'Outfit generated successfully!'
      };
      
      // Store in cache
      this.requestCache.set(cacheKey, result);
      
      // Set cache expiration
      setTimeout(() => {
        this.requestCache.delete(cacheKey);
      }, this.CACHE_TTL);
      
      return result;
      
    } catch (error) {
      console.error('Error generating outfit:', error);
      
      // Create a fallback outfit if AI fails
      const fallbackOutfit = this.createFallbackOutfit({
        tops: wardrobeItems.filter(item => item.category === 'tops'),
        bottoms: wardrobeItems.filter(item => item.category === 'bottoms'),
        shoes: wardrobeItems.filter(item => item.category === 'shoes'),
        outerwear: wardrobeItems.filter(item => item.category === 'outerwear'),
        dresses: wardrobeItems.filter(item => item.category === 'dresses'),
        accessories: wardrobeItems.filter(item => item.category === 'accessories')
      });
      
      return {
        success: true, // We return success with fallback rather than error
        outfit: fallbackOutfit,
        message: 'Used fallback outfit generator. ' + error.message
      };
    }
  }
  
  // Optimize the prompt construction for better performance
  constructPromptFromUserInput({ tops, bottoms, shoes, outerwear, dresses, accessories, userPrompt }) {
    // Create a simplified view of each item with only necessary fields
    const simplifyItem = (item) => ({
      id: item.addedAt,
      title: item.title || 'Unnamed item',
      brand: item.brand || '',
      color: this.extractColorFromTitle(item.title) || 'unknown'
    });
    
    // Include all available categories
    const allItems = {
      tops: tops.length > 0 ? tops.map(simplifyItem) : [],
      bottoms: bottoms.length > 0 ? bottoms.map(simplifyItem) : [],
      shoes: shoes.length > 0 ? shoes.map(simplifyItem) : [],
      outerwear: out