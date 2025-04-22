import React, { useState, useEffect } from 'react';
import './styler-page.css';
import AIChat from './AIChat';

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
  const [outfitName, setOutfitName] = useState("Name your outfit");
  // State for outfits
  const [outfits, setOutfits] = useState([]);
  // Loading state
  const [loading, setLoading] = useState(true);
  // State to track if dresses/jumpsuits is selected
  const [hasDresses, setHasDresses] = useState(false);
  // State for saving feedback
  const [saveFeedback, setSaveFeedback] = useState({
    show: false,
    message: '',
    type: 'success' // or 'error'
  });

  // Load data on component mount
  useEffect(() => {
    // Parse URL parameters to get selected categories
    const queryParams = new URLSearchParams(window.location.search);
    const categoriesParam = queryParams.get('categories');
    
    if (categoriesParam) {
      const categories = categoriesParam.split(',');
      
      // Ensure we have at least 1 category and no more than 4
      const validCategories = categories.slice(0, 4);
      
      if (validCategories.length > 0) {
        setSelectedCategories(validCategories);
        console.log('Selected categories:', validCategories);
        
        // Check if dresses/jumpsuits is selected
        if (validCategories.includes('dresses/jumpsuits') || validCategories.includes('dresses')) {
          setHasDresses(true);
        }
        
        // Initialize current indices for each category
        const initialIndices = {};
        validCategories.forEach(cat => {
          initialIndices[cat] = 0;
        });
        setCurrentIndices(initialIndices);
      }
    }
    
    // Load the wardrobe data
    loadWardrobe();
  }, []);

  // Filter wardrobe items based on selected categories whenever wardrobe or categories change
  useEffect(() => {
    if (wardrobe.length > 0 && selectedCategories.length > 0) {
      const filtered = {};
      
      selectedCategories.forEach(category => {
        // Handle the case for dresses/jumpsuits which should map to 'dresses' in the data
        const normalizedCategory = category.toLowerCase() === 'dresses/jumpsuits' 
          ? 'dresses' 
          : category.toLowerCase();
        
        filtered[category] = wardrobe.filter(item => 
          item.category === normalizedCategory
        );
      });
      
      setFilteredItems(filtered);
      setLoading(false);
    }
  }, [wardrobe, selectedCategories]);
  
  // Validate that we have at least one selected category
  useEffect(() => {
    if (selectedCategories.length === 0 && !loading) {
      // If somehow no categories were selected, redirect back to category selection
      alert('Please select at least one category to style.');
      goToStyling();
    }
  }, [selectedCategories, loading]);

  useEffect(() => {
    // Set up direct DOM access as a backup for the input field
    const setupDirectAccess = () => {
      try {
        const inputElement = document.getElementById('outfit-name-input');
        if (inputElement) {
          // Add a direct input event listener
          const handleDirectInput = (e) => {
            try {
              setOutfitName(e.target.value);
            } catch (err) {
              console.log('State update error:', err);
              // The direct value will still be read in saveOutfit
            }
          };
          
          // Remove any existing listeners first
          inputElement.removeEventListener('input', handleDirectInput);
          // Add the new listener
          inputElement.addEventListener('input', handleDirectInput);
          
          console.log('Direct DOM access for outfit name input setup');
        }
      } catch (err) {
        console.log('Error setting up direct DOM access:', err);
      }
    };
    
    // Set up immediately
    setupDirectAccess();
    
    // Try again after a short delay to ensure DOM is ready
    const timer = setTimeout(setupDirectAccess, 500);
    
    return () => {
      clearTimeout(timer);
      try {
        const inputElement = document.getElementById('outfit-name-input');
        if (inputElement) {
          // Clean up event listeners
          inputElement.removeEventListener('input', () => {});
        }
      } catch (err) {
        // Ignore cleanup errors
      }
    };
  }, []);

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

  // Save the current outfit - IMPROVED VERSION
  const saveOutfit = () => {
    // Try to get the outfit name directly from the DOM element as a fallback
    let finalOutfitName = outfitName || "My Outfit";
    try {
      const inputElement = document.getElementById('outfit-name-input');
      if (inputElement && inputElement.value) {
        finalOutfitName = inputElement.value;
        console.log('Got outfit name from DOM:', finalOutfitName);
      }
    } catch (err) {
      console.log('Error getting direct input value:', err);
    }
    // Collect the current item from each category
    const outfitItems = {};
    let hasItems = false;
    
    selectedCategories.forEach(category => {
      const currentItem = getCurrentItem(category);
      if (currentItem) {
        outfitItems[category] = currentItem;
        hasItems = true;
      }
    });
    
    // Check if we have at least one item
    if (!hasItems) {
      setSaveFeedback({
        show: true,
        message: 'Please select at least one item for your outfit.',
        type: 'error'
      });
      
      // Hide feedback after 3 seconds
      setTimeout(() => {
        setSaveFeedback({ show: false, message: '', type: 'success' });
      }, 3000);
      
      return;
    }

    // Create the outfit object with a consistent structure
    const newOutfit = {
      id: 'outfit_' + Date.now(), // Generate a unique ID
      name: outfitName || 'My Outfit',
      items: outfitItems,
      createdAt: new Date().toISOString(),
      // Additional metadata to help with debugging
      source: 'styler-page',
      version: '1.0'
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      // ALWAYS use 'savedOutfits' as the consistent storage key
      chrome.storage.local.get('savedOutfits', (data) => {
        const existingOutfits = data.savedOutfits || [];
        console.log('Existing outfits:', existingOutfits.length);
        
        // Add the new outfit to the beginning of the array
        const updatedOutfits = [newOutfit, ...existingOutfits];
        
        // Save back to storage
        chrome.storage.local.set({ savedOutfits: updatedOutfits }, () => {
          console.log('Outfit saved successfully!', newOutfit);
          
          // Show success feedback
          setSaveFeedback({
            show: true,
            message: 'Outfit saved successfully!',
            type: 'success'
          });
          
          // Hide feedback after 3 seconds
          setTimeout(() => {
            setSaveFeedback({ show: false, message: '', type: 'success' });
          }, 3000);
          
          // Update the local state
          setOutfits(updatedOutfits);
          
          // Also try to update any open fullpage views via message passing
          try {
            chrome.runtime.sendMessage({
              action: 'outfitSaved',
              outfits: updatedOutfits
            });
          } catch (e) {
            console.log('Could not notify other views of outfit save:', e);
          }
          
          // Show a notification
          try {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: '/logo.png',
              title: 'Outfit Saved',
              message: `"${newOutfit.name}" has been added to your outfits collection!`
            });
          } catch (e) {
            console.log('Notification API not available:', e);
          }
        });
      });
    } else {
      // For development outside extension
      console.log('Saving outfit in development mode:', newOutfit);
      const updatedOutfits = [newOutfit, ...outfits];
      setOutfits(updatedOutfits);
      
      // Show success feedback
      setSaveFeedback({
        show: true,
        message: 'Outfit saved successfully! (Development Mode)',
        type: 'success'
      });
      
      // Hide feedback after 3 seconds
      setTimeout(() => {
        setSaveFeedback({ show: false, message: '', type: 'success' });
      }, 3000);
    }
  };

  // Handle AI-generated outfit
  const handleOutfitGenerated = (outfit) => {
    if (!outfit || !outfit.items) return;
    
    // Set outfit name from the AI suggestion
    if (outfit.name) {
      setOutfitName(outfit.name);
    }
    
    // Update the displayed items based on AI selection
    const newIndices = { ...currentIndices };
    
    // Process each category in the outfit
    Object.entries(outfit.items).forEach(([category, item]) => {
      if (!item) return;
      
      // Find the category in selected categories (accounting for naming differences)
      let matchedCategory = selectedCategories.find(
        cat => cat.toLowerCase() === category.toLowerCase() || 
               (cat.toLowerCase() === 'dresses/jumpsuits' && category.toLowerCase() === 'dresses')
      );
      
      if (!matchedCategory) return;
      
      // Find the item in the filtered items
      const itemList = filteredItems[matchedCategory];
      if (!itemList) return;
      
      const itemIndex = itemList.findIndex(i => i.addedAt === item.addedAt);
      if (itemIndex !== -1) {
        newIndices[matchedCategory] = itemIndex;
      }
    });
    
    // Update all indices at once
    setCurrentIndices(newIndices);
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
        action: 'openOutfitCreator',
        navigateTo: 'category-selector'
      });
    } else {
      // For development
      window.location.href = '/category-selector.html';
    }
  };

  // Get only the categories that were selected by the user
  // Return them in a consistent order for better user experience
  const getOrderedCategories = () => {
    // Define preferred order for categories (for consistent placement)
    const categoryOrder = [
      'tops', 
      'dresses/jumpsuits', 
      'bottoms', 
      'shoes', 
      'accessories'
    ];
    
    // Filter to only selected categories and sort them according to preferred order
    const orderedCategories = selectedCategories
      .filter(category => category) // Remove any empty values
      .sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        return indexA - indexB;
      });
    
    // Limit to maximum 4 categories as specified
    return orderedCategories.slice(0, 4);
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
            {hasMultipleItems ? (
              <div 
                className="arrow" 
                onClick={handlePrev}
              >
                &lt;
              </div>
            ) : (
              <div className="arrow-placeholder"></div>
            )}
          </div>

                      <div className={`items-display ${!hasMultipleItems ? 'single-item' : ''}`}>
            {hasMultipleItems ? (
              <>
                {prevItemObj && (
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
                </div>

                {nextItemObj && (
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
              </>
            ) : (
              // When there's only one item, display it in a centered way
              <div className="single-center-item">
                <img 
                  src={currentItem.imageUrl} 
                  alt={currentItem.title || category} 
                  className="item-image center-image"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            )}
          </div>

          <div className="arrow-container right-arrow">
            {hasMultipleItems ? (
              <div 
                className="arrow" 
                onClick={handleNext}
              >
                &gt;
              </div>
            ) : (
              <div className="arrow-placeholder"></div>
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

  // Feedback toast component
  const FeedbackToast = ({ show, message, type }) => {
    if (!show) return null;
    
    return (
      <div className={`feedback-toast ${type}`}>
        {message}
      </div>
    );
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
            disabled={false}
            readOnly={false}
          />
        </div>

        <div className={`outfit-display mannequin-layout ${orderedCategories.length === 1 ? 'single-category' : ''}`}>
          {orderedCategories.map(category => (
            <div 
              key={category} 
              className={`category-section ${category.toLowerCase().replace('/', '-')}-section`}
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
        
        {/* Feedback Toast */}
        <FeedbackToast 
          show={saveFeedback.show}
          message={saveFeedback.message}
          type={saveFeedback.type}
        />
        
        {/* AI Chat Component */}
        <AIChat 
            onOutfitGenerated={handleOutfitGenerated}
            wardrobe={wardrobe}
            selectedCategories={selectedCategories}
        />
      </main>

      {/* Add CSS for feedback toast */}
      <style jsx>{`
        .feedback-toast {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 4px;
          color: white;
          font-family: Helvetica, Arial, sans-serif;
          font-size: 14px;
          z-index: 1000;
          animation: fadeInOut 3s ease-in-out forwards;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        
        .feedback-toast.success {
          background-color: #4caf50;
        }
        
        .feedback-toast.error {
          background-color: #f44336;
        }
        
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translate(-50%, 20px); }
          10% { opacity: 1; transform: translate(-50%, 0); }
          90% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, 20px); }
        }
      `}</style>
    </div>
  );
};

export default StylerPage;