import React, { useState, useEffect } from 'react';
import './styler-page.css';

const StylerPage = () => {
  // State for storing the selected categories from URL parameters
  const [selectedCategories, setSelectedCategories] = useState([]);
  // State for storing wardrobe items
  const [wardrobe, setWardrobe] = useState([]);
  // State for filtered items by category
  const [filteredItems, setFilteredItems] = useState({});
  // State for the current outfit - index of selected item in each category
  const [currentIndices, setCurrentIndices] = useState({});
  // State for outfit name
  const [outfitName, setOutfitName] = useState("dinner in downtown");
  // State for outfits
  const [outfits, setOutfits] = useState([]);
  // Loading state
  const [loading, setLoading] = useState(true);

  // Load data on component mount
  useEffect(() => {
    // Parse URL parameters to get selected categories
    const queryParams = new URLSearchParams(window.location.search);
    const categoriesParam = queryParams.get('categories');
    
    if (categoriesParam) {
      const categories = categoriesParam.split(',');
      setSelectedCategories(categories);
      console.log('Selected categories:', categories);
      
      // Initialize current indices for each category
      const initialIndices = {};
      categories.forEach(cat => {
        initialIndices[cat] = 0;
      });
      setCurrentIndices(initialIndices);
    }
    
    // Load the wardrobe data
    loadWardrobe();
  }, []);

  // Filter wardrobe items based on selected categories whenever wardrobe or categories change
  useEffect(() => {
    if (wardrobe.length > 0 && selectedCategories.length > 0) {
      const filtered = {};
      
      selectedCategories.forEach(category => {
        // Convert category name to lowercase to match the data structure
        const normalizedCategory = category.toLowerCase();
        filtered[category] = wardrobe.filter(item => 
          item.category === normalizedCategory
        );
      });
      
      setFilteredItems(filtered);
      setLoading(false);
    }
  }, [wardrobe, selectedCategories]);

  // Load wardrobe from Chrome storage
  const loadWardrobe = () => {
    setLoading(true);
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'getWardrobe' }, (response) => {
        if (response && response.success) {
          setWardrobe(response.wardrobe || []);
        } else {
          console.error('Failed to load wardrobe data');
          setWardrobe([]);
        }
      });
    } else {
      // For development outside extension
      console.warn('Chrome runtime not available. Using empty wardrobe for development.');
      setWardrobe([]);
    }
    setLoading(false);
  };

  // Navigate to the next item in a category
  const nextItem = (category) => {
    if (!filteredItems[category] || filteredItems[category].length <= 1) return;
    
    setCurrentIndices(prev => ({
      ...prev,
      [category]: (prev[category] + 1) % filteredItems[category].length
    }));
  };

  // Navigate to the previous item in a category
  const prevItem = (category) => {
    if (!filteredItems[category] || filteredItems[category].length <= 1) return;
    
    setCurrentIndices(prev => ({
      ...prev,
      [category]: (prev[category] - 1 + filteredItems[category].length) % filteredItems[category].length
    }));
  };

  // Get the current item for a category
  const getCurrentItem = (category) => {
    if (!filteredItems[category] || filteredItems[category].length === 0) return null;
    
    const currentIndex = currentIndices[category] || 0;
    return filteredItems[category][currentIndex];
  };

  // Get the previous item for a category
  const getPrevItem = (category) => {
    if (!filteredItems[category] || filteredItems[category].length <= 1) return null;
    
    const currentIndex = currentIndices[category] || 0;
    const prevIndex = (currentIndex - 1 + filteredItems[category].length) % filteredItems[category].length;
    return filteredItems[category][prevIndex];
  };

  // Get the next item for a category
  const getNextItem = (category) => {
    if (!filteredItems[category] || filteredItems[category].length <= 1) return null;
    
    const currentIndex = currentIndices[category] || 0;
    const nextIndex = (currentIndex + 1) % filteredItems[category].length;
    return filteredItems[category][nextIndex];
  };

  // Save the current outfit
  const saveOutfit = () => {
    const outfitItems = {};
    
    // Collect the current item from each category
    selectedCategories.forEach(category => {
      const currentItem = getCurrentItem(category);
      if (currentItem) {
        outfitItems[category] = currentItem;
      }
    });
    
    // Check if we have at least one item
    if (Object.keys(outfitItems).length === 0) {
      alert('Please select at least one item for your outfit.');
      return;
    }

    const newOutfit = {
      id: Date.now().toString(),
      name: outfitName || 'Unnamed Outfit',
      items: outfitItems,
      createdAt: new Date().toISOString()
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['outfits'], (data) => {
        const existingOutfits = data.outfits || [];
        const updatedOutfits = [...existingOutfits, newOutfit];
        
        chrome.storage.local.set({ outfits: updatedOutfits }, () => {
          alert('Outfit saved successfully!');
          setOutfits(updatedOutfits);
        });
      });
    } else {
      // For development
      alert('Outfit saved successfully! (Development mode)');
      setOutfits([...outfits, newOutfit]);
    }
  };

  // Navigate back to wardrobe
  const goToWardrobe = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'openFullPage' });
    } else {
      // For development
      window.location.href = '/fullpage.html';
    }
  };

  // Navigate back to styling (category selection)
  const goToStyling = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ 
        action: 'openFullPage',
        navigateTo: 'category-selector'
      });
    } else {
      // For development
      window.location.href = '/category-selector.html';
    }
  };

  // Get order of categories (tops first, then bottoms, then shoes)
  const getOrderedCategories = () => {
    // Start with the core categories that should always be present
    const coreCategories = ['tops', 'bottoms', 'shoes'];
    const orderedCategories = [...coreCategories];
    
    // Then add any other selected categories not already included
    selectedCategories.forEach(category => {
      if (!orderedCategories.includes(category)) {
        orderedCategories.push(category);
      }
    });
    
    return orderedCategories;
  };

  // Render a category row
  const renderCategoryRow = (category) => {
    const items = filteredItems[category] || [];
    const isEmpty = items.length === 0;
    
    // If there are items in this category
    if (!isEmpty) {
      const currentItem = getCurrentItem(category);
      const prevItemObj = getPrevItem(category);
      const nextItemObj = getNextItem(category);
      
      const hasMultipleItems = items.length > 1;

      // Handle navigation functions
      const handlePrev = () => prevItem(category);
      const handleNext = () => nextItem(category);

      return (
        <div className="category-row">
          <div className="arrow-container left-arrow">
            {hasMultipleItems && (
              <div 
                className="arrow" 
                onClick={handlePrev}
              >
                &lt;
              </div>
            )}
          </div>

          <div className="items-display">
            {hasMultipleItems && prevItemObj && (
              <div className="side-item left-item">
                <img 
                  src={prevItemObj.imageUrl} 
                  alt={prevItemObj.title || category} 
                  className="item-image side-image"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            )}

            <div className="center-item">
              <img 
                src={currentItem.imageUrl} 
                alt={currentItem.title || category} 
                className="item-image center-image"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                }}
              />
              {items.length > 1 && (
                <div className="lock-icon">
                  🔒
                </div>
              )}
            </div>

            {hasMultipleItems && nextItemObj && (
              <div className="side-item right-item">
                <img 
                  src={nextItemObj.imageUrl} 
                  alt={nextItemObj.title || category} 
                  className="item-image side-image"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            )}
          </div>

          <div className="arrow-container right-arrow">
            {hasMultipleItems && (
              <div 
                className="arrow" 
                onClick={handleNext}
              >
                &gt;
              </div>
            )}
          </div>
        </div>
      );
    } 
    // Render empty placeholder for categories without items
    else {
      return (
        <div className="category-row empty-row">
          <div className="arrow-container left-arrow">
            <div className="arrow disabled">&lt;</div>
          </div>
          
          <div className="items-display">
            <div className="center-item empty-item">
              <div className="empty-item-placeholder">
                <span className="empty-item-message">No {category} selected</span>
                <span className="empty-item-subtext">Add some {category} to your wardrobe</span>
              </div>
            </div>
          </div>
          
          <div className="arrow-container right-arrow">
            <div className="arrow disabled">&gt;</div>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="styler-page loading">
        <div className="loading-spinner"></div>
        <p>Loading your wardrobe...</p>
      </div>
    );
  }

  const orderedCategories = getOrderedCategories();

  return (
    <div className="improved-styler-page">
      <header className="styler-header">
        <div className="logo-container">
          <img 
            src="/logo.png" 
            alt="FITD Logo" 
            className="logo" 
            style={{ maxWidth: '50px', maxHeight: '40px' }}
          />
        </div>
        
        <div className="nav-links">
          <a href="#" onClick={goToWardrobe} className="nav-link">BACK TO WARDROBE</a>
          <a href="#" onClick={goToStyling} className="nav-link">BACK TO STYLING</a>
        </div>
      </header>

      <main className="styler-content">
        <div className="outfit-name-container">
          <input 
            type="text" 
            value={outfitName}
            onChange={(e) => setOutfitName(e.target.value)}
            className="outfit-name-input"
            placeholder="Name your outfit"
          />
        </div>

        <div className="outfit-display mannequin-layout">
          {orderedCategories.map(category => (
            <div 
              key={category} 
              className={`category-section ${category.toLowerCase()}-section`}
            >
              {renderCategoryRow(category)}
              <div className="category-divider"></div>
            </div>
          ))}
        </div>

        <div className="outfit-actions">
          <button 
            className="save-outfit-button"
            onClick={saveOutfit}
          >
            ADD TO WARDROBE
          </button>
        </div>
      </main>
    </div>
  );
};

export default StylerPage;