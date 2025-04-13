import React, { useState, useRef, useEffect } from 'react';

const AIChat = ({ onOutfitGenerated, wardrobe, selectedCategories }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { 
      type: 'bot', 
      text: 'Hi! I can help you create outfits from your wardrobe. Try something like "Create a casual outfit for a coffee date" or "What should I wear to a summer wedding?"'
    }
  ]);
  const chatContainerRef = useRef(null);
  
  // Scroll to bottom of chat when new messages are added
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
  };

  // Get the currently selected categories (normalized)
  const getNormalizedSelectedCategories = () => {
    if (!selectedCategories || !Array.isArray(selectedCategories) || selectedCategories.length === 0) {
      // Default to all categories if none specified
      return ['tops', 'bottoms', 'shoes', 'outerwear', 'dresses', 'accessories'];
    }
    
    // Normalize categories (e.g., convert 'dresses/jumpsuits' to 'dresses')
    return selectedCategories.map(category => {
      if (category.toLowerCase() === 'dresses/jumpsuits') {
        return 'dresses';
      }
      return category.toLowerCase();
    });
  };

  // Get only items from selected categories
  const getFilteredWardrobe = () => {
    const normalizedCategories = getNormalizedSelectedCategories();
    console.log('Filtering wardrobe to categories:', normalizedCategories);
    return wardrobe.filter(item => normalizedCategories.includes(item.category));
  };

  // Use the existing extract-product endpoint since generate-outfit isn't ready yet
  const API_ENDPOINT = 'https://fashiondam.onrender.com/api/extract-product';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    // Add user message to chat
    setChatHistory(prev => [...prev, { type: 'user', text: message }]);
    
    // Clear input field
    const userPrompt = message;
    setMessage('');
    setIsGenerating(true);
    
    try {
      // Add thinking message
      setChatHistory(prev => [...prev, { type: 'bot', text: 'Thinking...', isLoading: true }]);
      
      // Get filtered wardrobe based on selected categories
      const filteredWardrobe = getFilteredWardrobe();
      
      // Create a prompt for the AI
      const prompt = constructPrompt(filteredWardrobe, userPrompt);
      
      console.log('Sending prompt to API:', prompt.substring(0, 100) + '...');
      
      // Send to your proxy server
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt
        })
      });
      
      // Remove the thinking message
      setChatHistory(prev => prev.filter(msg => !msg.isLoading));
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown server error');
      }
      
      // Process the AI response
      console.log('AI response:', data.result);
      
      // Parse the response to create an outfit
      const outfit = parseOutfitResponse(data.result, filteredWardrobe);
      
      // Add success message to chat
      setChatHistory(prev => [...prev, { 
        type: 'bot', 
        text: `I've created an outfit based on your request! ${outfit.reasoning}`
      }]);
      
      // Pass the outfit to the parent component
      console.log('Sending outfit to StylerPage:', outfit);
      if (onOutfitGenerated) {
        onOutfitGenerated(outfit);
      }
    } catch (error) {
      console.error('Error generating outfit:', error);
      
      // Generate a fallback outfit locally
      const fallbackOutfit = generateFallbackOutfit(userPrompt);
      
      // Add fallback message to chat
      setChatHistory(prev => [...prev, { 
        type: 'bot', 
        text: `I've created an outfit based on your request! ${fallbackOutfit.reasoning}`
      }]);
      
      // Pass the fallback outfit to the parent component
      if (onOutfitGenerated) {
        console.log('Sending fallback outfit to StylerPage:', fallbackOutfit);
        onOutfitGenerated(fallbackOutfit);
      }
    }
    
    setIsGenerating(false);
  };
  
  // Create a well-formatted prompt for the AI
  const constructPrompt = (wardrobeItems, userPrompt) => {
    // Extract categories from wardrobe
    const tops = wardrobeItems.filter(item => item.category === 'tops');
    const bottoms = wardrobeItems.filter(item => item.category === 'bottoms');
    const shoes = wardrobeItems.filter(item => item.category === 'shoes');
    const outerwear = wardrobeItems.filter(item => item.category === 'outerwear');
    const dresses = wardrobeItems.filter(item => item.category === 'dresses');
    const accessories = wardrobeItems.filter(item => item.category === 'accessories');
    
    // Create a simplified view of each item
    const simplifyItem = (item) => ({
      id: item.addedAt,
      title: item.title || 'Unnamed item',
      brand: item.brand || '',
      color: extractColorFromTitle(item.title) || 'unknown',
      description: item.description ? item.description.substring(0, 100) : ''
    });
    
    // Include all available categories
    const allItems = {
      tops: tops.length > 0 ? tops.map(simplifyItem) : [],
      bottoms: bottoms.length > 0 ? bottoms.map(simplifyItem) : [],
      shoes: shoes.length > 0 ? shoes.map(simplifyItem) : [],
      outerwear: outerwear.length > 0 ? outerwear.map(simplifyItem) : [],
      dresses: dresses.length > 0 ? dresses.map(simplifyItem) : [],
      accessories: accessories.length > 0 ? accessories.map(simplifyItem) : []
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
    
    return prompt;
  };
  
  // Helper to extract color from title
  const extractColorFromTitle = (text) => {
    if (!text) return null;
    
    const commonColors = [
      'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 
      'white', 'gray', 'grey', 'brown', 'navy', 'beige', 'maroon', 'teal'
    ];
    
    const lowerText = text?.toLowerCase() || '';
    for (const color of commonColors) {
      if (lowerText.includes(color)) {
        return color;
      }
    }
    
    return null;
  };
  
  // Parse the AI response into an outfit object
  const parseOutfitResponse = (responseText, wardrobeItems) => {
    try {
      console.log('Parsing AI response:', responseText);
      
      // Find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not find JSON in the response');
      }
      
      const jsonStr = jsonMatch[0];
      const outfitData = JSON.parse(jsonStr);
      
      // For safety, if parsing fails or structure is wrong, create a fallback
      if (!outfitData || !outfitData.outfit) {
        throw new Error('Invalid outfit data structure');
      }
      
      // Extract categories from wardrobe
      const tops = wardrobeItems.filter(item => item.category === 'tops');
      const bottoms = wardrobeItems.filter(item => item.category === 'bottoms');
      const shoes = wardrobeItems.filter(item => item.category === 'shoes');
      const outerwear = wardrobeItems.filter(item => item.category === 'outerwear');
      const dresses = wardrobeItems.filter(item => item.category === 'dresses');
      const accessories = wardrobeItems.filter(item => item.category === 'accessories');
      
      const itemsByCategory = {
        tops, bottoms, shoes, outerwear, dresses, accessories
      };
      
      // Convert IDs to actual items
      const outfitItems = {};
      
      Object.entries(outfitData.outfit).forEach(([category, itemId]) => {
        if (!itemId || itemId === "null") return;
        
        const items = itemsByCategory[category] || [];
        const matchedItem = items.find(item => item.addedAt === itemId);
        
        if (matchedItem) {
          outfitItems[category] = matchedItem;
        }
      });
      
      // Create the final outfit object
      return {
        items: outfitItems,
        reasoning: outfitData.reasoning || 'These items complement each other well.',
        name: `AI Generated ${capitalizeFirst(outfitData.occasion || 'Outfit')}`
      };
    } catch (error) {
      console.error('Error parsing outfit response:', error);
      
      // Return a fallback outfit if parsing fails
      return generateFallbackOutfit();
    }
  };
  
  // Helper to capitalize first letter
  const capitalizeFirst = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  
  // Fallback generator for when AI fails
  const generateFallbackOutfit = (userPrompt) => {
    console.log('Generating fallback outfit with prompt:', userPrompt);
    
    // Get filtered wardrobe based on selected categories
    const filteredWardrobe = getFilteredWardrobe();
    
    // Extract categories from filtered wardrobe
    const tops = filteredWardrobe.filter(item => item.category === 'tops');
    const bottoms = filteredWardrobe.filter(item => item.category === 'bottoms');
    const shoes = filteredWardrobe.filter(item => item.category === 'shoes');
    const dresses = filteredWardrobe.filter(item => item.category === 'dresses');
    const accessories = filteredWardrobe.filter(item => item.category === 'accessories');
    
    // Simple outfit generation logic based on prompt keywords
    const isForFormal = userPrompt?.toLowerCase().includes('formal') || 
                        userPrompt?.toLowerCase().includes('wedding') || 
                        userPrompt?.toLowerCase().includes('dinner');
    
    const isForCasual = userPrompt?.toLowerCase().includes('casual') || 
                        userPrompt?.toLowerCase().includes('coffee') || 
                        userPrompt?.toLowerCase().includes('everyday');
                       
    const isForSummer = userPrompt?.toLowerCase().includes('summer') || 
                        userPrompt?.toLowerCase().includes('hot') || 
                        userPrompt?.toLowerCase().includes('beach');
    
    const isForWinter = userPrompt?.toLowerCase().includes('winter') || 
                        userPrompt?.toLowerCase().includes('cold') || 
                        userPrompt?.toLowerCase().includes('snow');
    
    // Select random items from each category
    let selectedTop = tops.length > 0 ? tops[Math.floor(Math.random() * tops.length)] : null;
    let selectedBottom = bottoms.length > 0 ? bottoms[Math.floor(Math.random() * bottoms.length)] : null;
    let selectedShoes = shoes.length > 0 ? shoes[Math.floor(Math.random() * shoes.length)] : null;
    let selectedDress = dresses.length > 0 ? dresses[Math.floor(Math.random() * dresses.length)] : null;
    let selectedAccessory = accessories.length > 0 ? accessories[Math.floor(Math.random() * accessories.length)] : null;
    
    // Build the outfit object
    const outfitItems = {};
    
    // For formal occasions, prefer dresses if available
    if (isForFormal && selectedDress) {
      outfitItems.dresses = selectedDress;
      if (selectedShoes) outfitItems.shoes = selectedShoes;
      if (selectedAccessory) outfitItems.accessories = selectedAccessory;
    } else {
      // Standard outfit with top and bottom
      if (selectedTop) outfitItems.tops = selectedTop;
      if (selectedBottom) outfitItems.bottoms = selectedBottom;
      if (selectedShoes) outfitItems.shoes = selectedShoes;
      if (isForFormal || isForSummer) {
        if (selectedAccessory) outfitItems.accessories = selectedAccessory;
      }
    }
    
    // Generate a reasoning based on the outfit and occasion
    let reasoning = '';
    if (isForFormal) {
      reasoning = "I've selected items that work well for a formal occasion, focusing on elegant pieces that create a polished look.";
    } else if (isForCasual) {
      reasoning = "I've created a relaxed, casual outfit that's comfortable yet stylish for everyday wear.";
    } else if (isForSummer) {
      reasoning = "I've selected light, breathable pieces that will keep you cool during the summer while looking stylish.";
    } else if (isForWinter) {
      reasoning = "I've chosen warm, layerable pieces that will keep you cozy in cold weather while maintaining a fashionable look.";
    } else {
      reasoning = "I've selected versatile pieces that work well together and can be adapted for different settings.";
    }
    
    // Create outfit name based on the prompt
    let occasionName = "Versatile";
    if (isForFormal) occasionName = "Formal";
    else if (isForCasual) occasionName = "Casual";
    else if (isForSummer) occasionName = "Summer";
    else if (isForWinter) occasionName = "Winter";
    
    return {
      items: outfitItems,
      reasoning: reasoning,
      name: `AI Generated ${occasionName} Outfit`
    };
  };

  return (
    <div className="ai-chat-container">
      {/* Chat button (logo) */}
      <button 
        className="chat-toggle-button" 
        onClick={toggleChat}
        aria-label="Toggle AI Stylist Chat"
      >
        <div className="ai-logo-container">
            <img 
                src="/logo.png"
                alt="FITD Logo"
                className="ai-logo-img"
            />
        </div>
      </button>
      
      {/* Chat window */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>FITD AI Stylist</h3>
            <button 
              className="close-chat-btn"
              onClick={toggleChat}
              aria-label="Close Chat"
            >
              ×
            </button>
          </div>
          
          <div className="chat-messages" ref={chatContainerRef}>
            {chatHistory.map((msg, index) => (
              <div 
                key={index} 
                className={`chat-message ${msg.type} ${msg.isLoading ? 'loading' : ''}`}
              >
                {msg.type === 'bot' && (
                  <div className="bot-avatar">
                    <img 
                        src="/logo.png"
                        alt="FITD Logo"
                        style={{ 
                            width: '24px', 
                            height: '24px', 
                            objectFit: 'contain' 
                          }}
                    />
                  </div>
                )}
                <div className="message-content">
                  {msg.text}
                  {msg.isLoading && <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>}
                </div>
              </div>
            ))}
          </div>
          
          <form className="chat-input" onSubmit={handleSubmit}>
            <input
              type="text"
              value={message}
              onChange={handleInputChange}
              placeholder="Describe what outfit you need..."
              disabled={isGenerating}
            />
            <button 
              type="submit" 
              disabled={isGenerating || !message.trim()}
              aria-label="Send Message"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIChat;