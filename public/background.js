// background.js - Enhanced with AI product extraction capabilities
console.log('Virtual Closet background script loaded');

// Create context menu and browser action when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for right-clicking on images
  chrome.contextMenus.create({
    id: "addToVirtualCloset",
    title: "Add to Virtual Closet",
    contexts: ["image"]
  });
  
  // Create browser action button
  chrome.action.onClicked.addListener(() => {
    // When the extension icon is clicked (not the popup), open the full page
    openFullPage();
  });
  
  // Initialize settings if they don't exist
  chrome.storage.local.get(['openai_api_key', 'ai_outfit_settings', 'ai_extraction_settings'], (data) => {
    if (!data.ai_outfit_settings) {
      chrome.storage.local.set({
        ai_outfit_settings: {
          enabled: true,
          model: 'gpt-3.5-turbo'
        }
      });
    }
    
    if (!data.ai_extraction_settings) {
      chrome.storage.local.set({
        ai_extraction_settings: {
          enabled: true,
          model: 'gpt-3.5-turbo'
        }
      });
    }
    
    // Note: We don't set a default API key as it should be user-provided
    // or securely stored by the developer
  });
});

// Function to open the extension as a full page
function openFullPage(options = {}) {
  const { navigateTo, selectedCategories } = options;
  
  console.log('Opening page:', navigateTo, selectedCategories);
  
  let pageURL;
  let urlParams = new URLSearchParams();
  
  // Determine which page to open
  if (navigateTo === 'category-selector') {
    pageURL = chrome.runtime.getURL('category-selector.html');
  } else {
    pageURL = chrome.runtime.getURL('fullpage.html');
    
    // Add tab parameter if specified
    if (navigateTo) {
      urlParams.append('tab', navigateTo);
    }
    
    // Add selected categories if provided
    if (selectedCategories && selectedCategories.length > 0) {
      urlParams.append('categories', selectedCategories.join(','));
    }
  }
  
  // Construct full URL with parameters
  const fullURL = `${pageURL}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
  
  console.log('Full URL to open:', fullURL);
  
  chrome.tabs.create({url: fullURL}, (tab) => {
    if (chrome.runtime.lastError) {
      console.error('Error opening page:', chrome.runtime.lastError);
    } else {
      console.log('Successfully opened page in tab:', tab.id);
    }
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addToVirtualCloset") {
    console.log("Context menu item clicked");
    
    // Get the image URL that was right-clicked
    const imageUrl = info.srcUrl;
    
    if (imageUrl) {
      // Try to extract product info from the page
      chrome.tabs.sendMessage(
        tab.id, 
        { 
          action: 'extractProductInfoForImage',
          imageUrl: imageUrl  
        }, 
        (response) => {
          // Handle errors communicating with content script
          if (chrome.runtime.lastError) {
            console.error('Error communicating with content script:', chrome.runtime.lastError);
            // Create fallback product info with just the image
            const fallbackResponse = {
              title: tab.title || 'Unknown Product',
              imageUrl: imageUrl,
              url: tab.url,
              timestamp: new Date().toISOString()
            };
            processProductInfo(fallbackResponse);
            return;
          }
          
          if (response) {
            // Make sure we're using the right-clicked image
            response.imageUrl = imageUrl;
            processProductInfo(response);
          } else {
            // Fallback if no response
            const fallbackResponse = {
              title: tab.title || 'Unknown Product',
              imageUrl: imageUrl,
              url: tab.url,
              timestamp: new Date().toISOString()
            };
            processProductInfo(fallbackResponse);
          }
        }
      );
    }
  }
});

// Listen for messages from the popup or fullpage
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message in background script:', message.action);

  if (message.action === 'openOutfitCreator') {
    console.log('Opening outfit creator with options:', message);
    openFullPage({
      navigateTo: message.navigateTo
    });
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'openFullPage') {
    openFullPage(message.navigateTo); // Pass the navigation parameter
    sendResponse({ success: true });
    return true;
  }
  else if (message.action === 'getWardrobe') {
    // Get wardrobe data for fullpage or popup
    chrome.storage.local.get('wardrobe', (data) => {
      sendResponse({ 
        success: true,
        wardrobe: data.wardrobe || []
      });
    });
    return true; // Will respond asynchronously
  } 
  else if (message.action === 'updateWardrobe') {
    // Save updated wardrobe data from fullpage
    if (message.wardrobe) {
      chrome.storage.local.set({ wardrobe: message.wardrobe }, () => {
        sendResponse({ success: true });
        
        // Broadcast the update to all open extension pages
        chrome.runtime.sendMessage({
          action: 'wardrobeUpdated',
          wardrobe: message.wardrobe
        });
      });
      return true; // Will respond asynchronously
    }
  }
  else if (message.action === 'generateOutfit') {
    // Forward the request to the AI service
    console.log('Forwarding generateOutfit request to AI service');
    
    // Get the wardrobe if not provided
    if (!message.wardrobe) {
      chrome.storage.local.get('wardrobe', (data) => {
        const updatedMessage = {
          ...message,
          wardrobe: data.wardrobe || []
        };
        
        // Now forward to the AI service
        forwardToAIService(updatedMessage, sendResponse);
      });
      return true; // Will respond asynchronously
    } else {
      // Wardrobe already provided, just forward
      forwardToAIService(message, sendResponse);
      return true; // Will respond asynchronously
    }
  }
  else if (message.action === 'injectAIExtractor') {
    // Inject the AI extractor script into the active tab
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }
      
      // Get the script URL
      const scriptUrl = chrome.runtime.getURL('ai-product-extractor.js');
      
      // Inject the script
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['ai-product-extractor.js']
      }, (injectionResults) => {
        if (chrome.runtime.lastError) {
          console.error('Script injection failed:', chrome.runtime.lastError);
          sendResponse({ 
            success: false, 
            error: chrome.runtime.lastError.message 
          });
        } else {
          console.log('AI Product Extractor script injected successfully');
          sendResponse({ success: true });
        }
      });
    });
    return true; // Will respond asynchronously
  }
  else if (message.action === 'extractProductDataWithAI') {
    // Handle OpenAI API request for product extraction
    handleProductExtractionRequest(message, sendResponse);
    return true; // Will respond asynchronously
  }
});

// Forward a message to the AI service
function forwardToAIService(message, sendResponse) {
  try {
    // The AI service is loaded as a separate script
    // We'll just forward the message to it
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error forwarding to AI service:', chrome.runtime.lastError);
        sendResponse({ 
          success: false, 
          error: chrome.runtime.lastError.message || 'Could not communicate with AI service'
        });
      } else {
        sendResponse(response);
      }
    });
  } catch (error) {
    console.error('Error in forwardToAIService:', error);
    sendResponse({ 
      success: false, 
      error: error.message || 'Unknown error in AI service communication'
    });
  }
}

// Handle OpenAI API requests for product extraction
async function handleProductExtractionRequest(message, sendResponse) {
  try {
    console.log('Processing product extraction with OpenAI via proxy');
    console.log('Using prompt:', message.prompt.substring(0, 100) + '...');
    
    // server endpoint URL
    const API_PROXY_URL = 'https://fashiondam.onrender.com/api/extract-product';
    
    try {
      // Make the API request to your proxy server instead of directly to OpenAI
      const response = await fetch(API_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: message.prompt
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error details:', errorData);
        throw new Error(`API Error: ${errorData.error || 'Unknown error'}`);
      }
      
      const data = await response.json();
      console.log('Product extraction response received from proxy');
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred on the proxy server');
      }
      
      // Process the response to get structured product data
      const aiResponse = data.result || '';
      console.log('AI response preview:', aiResponse.substring(0, 100) + '...');
      
      // Parse the JSON from the AI response
      let productData;
      try {
        // Extract JSON from the response (it might contain markdown formatting)
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
        
        productData = JSON.parse(jsonString);
        
        // Add the original URL and image URL
        productData.url = message.url;
        productData.imageUrl = message.imageUrl;
        productData.timestamp = new Date().toISOString();
        
        // Infer category if not provided
        if (!productData.category) {
          productData.category = inferCategory(productData.title, productData.description);
        }
        
        console.log('Successfully extracted product data:', productData);
        sendResponse({
          success: true,
          productData: productData
        });
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        sendResponse({
          success: false,
          error: 'Failed to parse AI response: ' + parseError.message,
          rawResponse: aiResponse
        });
      }
    } catch (error) {
      console.error('Error in API request:', error);
      sendResponse({
        success: false,
        error: error.message || 'Failed to process API request'
      });
    }
  } catch (error) {
    console.error('Error in product extraction:', error);
    sendResponse({
      success: false,
      error: error.message || 'Unknown error in product extraction'
    });
  }
}

// Infer product category from title and description
function inferCategory(title, description) {
  const text = (title + ' ' + (description || '')).toLowerCase();
  
  if (text.includes('shirt') || text.includes('top') || text.includes('tee') || 
      text.includes('sweater') || text.includes('blouse') || text.includes('tank')) {
    return 'tops';
  } 
  else if (text.includes('pant') || text.includes('jean') || text.includes('skirt') || 
           text.includes('short') || text.includes('trouser') || text.includes('chino')) {
    return 'bottoms';
  } 
  else if (text.includes('shoe') || text.includes('boot') || text.includes('sneaker') || 
           text.includes('sandal') || text.includes('loafer') || text.includes('heel')) {
    return 'shoes';
  } 
  else if (text.includes('dress')) {
    return 'dresses';
  } 
  else if (text.includes('jacket') || text.includes('coat') || text.includes('hoodie') || 
           text.includes('cardigan') || text.includes('blazer')) {
    return 'outerwear';
  } 
  else if (text.includes('hat') || text.includes('scarf') || text.includes('glove') || 
           text.includes('sock') || text.includes('belt') || text.includes('jewelry') || 
           text.includes('accessory') || text.includes('bag') || text.includes('purse') || 
           text.includes('watch')) {
    return 'accessories';
  }
  
  return 'other';
}

/**
 * Process and store product information
 * @param {Object} response - The product info to process
 * @param {Function} sendResponse - Optional function to send response back to popup
 */
function processProductInfo(response, sendResponse = null) {
  // Save to storage
  if (response && response.imageUrl) {
    // Check if we already have the category from AI extraction
    let category = response.category || 'other';
    
    // If no category, detect it from text
    if (category === 'other') {
      const text = (response.title + ' ' + (response.description || '') + ' ' + (response.detailedDescription || '')).toLowerCase();
      
      if (text.includes('shirt') || text.includes('top') || text.includes('tee') || text.includes('sweater') || text.includes('blouse') || text.includes('tank')) {
        category = 'tops';
      } else if (text.includes('pant') || text.includes('jean') || text.includes('skirt') || text.includes('short') || text.includes('trouser') || text.includes('chino')) {
        category = 'bottoms';
      } else if (text.includes('shoe') || text.includes('boot') || text.includes('sneaker') || text.includes('sandal') || text.includes('loafer') || text.includes('heel')) {
        category = 'shoes';
      } else if (text.includes('dress')) {
        category = 'dresses';
      } else if (text.includes('jacket') || text.includes('coat') || text.includes('hoodie') || text.includes('cardigan') || text.includes('blazer')) {
        category = 'outerwear';
      } else if (text.includes('hat') || text.includes('scarf') || text.includes('glove') || text.includes('sock') || text.includes('belt') || 
                 text.includes('jewelry') || text.includes('accessory') || text.includes('bag') || text.includes('purse') || text.includes('watch')) {
        category = 'accessories';
      }
    }
    
    // Add category and timestamp to the product if not already present
    const productWithCategory = {
      ...response,
      category,
      addedAt: response.addedAt || new Date().toISOString()
    };
    
    // Store in Chrome storage
    chrome.storage.local.get('wardrobe', (data) => {
      const wardrobe = data.wardrobe || [];
      
      // Check if this item already exists (based on URL and image)
      const existingItemIndex = wardrobe.findIndex(item => 
        item.imageUrl === productWithCategory.imageUrl && 
        item.url === productWithCategory.url
      );
      
      if (existingItemIndex !== -1) {
        // Update existing item
        wardrobe[existingItemIndex] = productWithCategory;
        console.log('Updated existing wardrobe item');
      } else {
        // Add new item
        wardrobe.push(productWithCategory);
        console.log('Added new wardrobe item');
      }
      
      chrome.storage.local.set({ wardrobe }, () => {
        // Show a notification to the user
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/vite.svg',
          title: 'Virtual Closet',
          message: 'Item added to your wardrobe!'
        });
        
        if (sendResponse) {
          sendResponse({ 
            success: true, 
            message: 'Product added to your virtual wardrobe',
            product: productWithCategory
          });
        }
        
        // Broadcast update to any open instances of the extension
        chrome.runtime.sendMessage({
          action: 'wardrobeUpdated',
          wardrobe: wardrobe
        });
      });
    });
  } else if (sendResponse) {
    sendResponse({ 
      error: 'Could not detect product information on this page.' 
    });
  }
}