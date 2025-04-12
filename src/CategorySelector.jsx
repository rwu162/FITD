import React, { useState, useEffect } from 'react';
import './styling.css';
import './category-selector.css';

console.log('CategorySelector Component Imported');

const CategorySelector = () => {
  console.log('CategorySelector Component Initialized');
  
  const [wardrobe, setWardrobe] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState({
    tops: false,
    bottoms: false,
    'dresses/jumpsuits': false,
    shoes: false,
    accessories: false
  });

  // Load wardrobe data
  useEffect(() => {
    console.log('CategorySelector useEffect Called');
    loadWardrobe();
  }, []);

  // Load wardrobe from Chrome storage
  const loadWardrobe = () => {
    console.log('Loading wardrobe');
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      console.log('Sending message to get wardrobe');
      chrome.runtime.sendMessage({ action: 'getWardrobe' }, (response) => {
        console.log('Wardrobe response:', response);
        if (response && response.success) {
          setWardrobe(response.wardrobe || []);
        } else {
          console.error('Failed to load wardrobe data');
        }
      });
    } else {
      console.warn('Chrome runtime not available. Using mock data.');
      // Mock data for development
      setWardrobe([
        { category: 'tops', title: 'Sample Top' },
        { category: 'bottoms', title: 'Sample Bottom' }
      ]);
    }
  };

  // Count items in each category
  const getCategoryCount = (category) => {
    return wardrobe.filter(item => item.category === category.toLowerCase()).length;
  };

  // Toggle category selection
  const toggleCategory = (category) => {
    setSelectedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Proceed to outfit creator
  const proceedToOutfitCreator = () => {
    // Collect selected categories
    const selected = Object.keys(selectedCategories)
      .filter(category => selectedCategories[category]);
    
    // If no categories selected, show alert
    if (selected.length === 0) {
      alert('Please select at least one category');
      return;
    }
  
    console.log('Selected categories:', selected);
  
    // Navigate to the styler page with selected categories
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ 
        action: 'openStylerPage', // Changed to a specific action for styler
        selectedCategories: selected
      }, (response) => {
        // Log response to debug
        console.log('Navigation response:', response);
        
        if (!response || !response.success) {
          console.error('Failed to navigate to styler page:', response?.error || 'Unknown error');
        }
      });
    } else {
      console.warn('Cannot navigate - chrome runtime not available');
      // For development
      const categoriesParam = selected.join(',');
      window.location.href = `/styler.html?categories=${categoriesParam}`;
    }
  };

  // Render category selector
  return (
    <div className="category-selector-container">
        <img 
          src="/logo.png" 
          alt="FITD logo" 
          className="logo" 
        />
      <a href="#" className="back-link">BACK TO WARDROBE</a>
      
      <main className="category-selector-content">
        <h1>WHAT ARE YOU STYLING TODAY ?</h1>
        <p>Select all that may apply</p>
        
        <div className="category-grid">
          {Object.entries(selectedCategories).map(([category, isSelected]) => (
            <div 
              key={category} 
              className={`category-item ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleCategory(category)}
            >
              <label>
                <input 
                  type="checkbox" 
                  checked={isSelected}
                  onChange={() => toggleCategory(category)}
                />
                {category.toUpperCase()}
                <span className="item-count">({getCategoryCount(category)} items)</span>
              </label>
            </div>
          ))}
        </div>
        
        <button 
          className="next-button" 
          onClick={proceedToOutfitCreator}
        >
          NEXT
        </button>
      </main>
      
      <div className="background-image">
        <img 
          src="/kendall-jenner.jpg" 
          alt="Fashion" 
          className="fashion-image"
        />
      </div>
    </div>
  );
};

export default CategorySelector;