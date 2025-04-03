import React, { useState } from 'react';
import './fullpage.css';
import './styling.css';
import './outfit-creator.css';

const OutfitCreator = ({ wardrobe, onClose, onSave }) => {
  const [selectedItems, setSelectedItems] = useState({
    tops: null,
    bottoms: null,
    shoes: null,
    outerwear: null,
    accessories: null
  });
  const [outfitDetails, setOutfitDetails] = useState({
    name: '',
    occasion: 'casual',
    notes: ''
  });
  const [currentSelection, setCurrentSelection] = useState(null);
  const [showSelectionPanel, setShowSelectionPanel] = useState(false);

  // Get wardrobe items by category
  const getItemsByCategory = (category) => {
    return wardrobe.filter(item => item.category === category);
  };

  // Handle detail changes
  const handleDetailChange = (e) => {
    const { name, value } = e.target;
    setOutfitDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Open selection panel for a specific category
  const openSelectionPanel = (category) => {
    setCurrentSelection(category);
    setShowSelectionPanel(true);
  };

  // Close selection panel
  const closeSelectionPanel = () => {
    setShowSelectionPanel(false);
    setCurrentSelection(null);
  };

  // Select an item for the outfit
  const selectItem = (item) => {
    setSelectedItems(prev => ({
      ...prev,
      [currentSelection]: item
    }));
    setShowSelectionPanel(false);
  };

  // Remove an item from the outfit
  const removeItem = (category) => {
    setSelectedItems(prev => ({
      ...prev,
      [category]: null
    }));
  };

  // Save the outfit
  const saveOutfit = () => {
    // Check if we have the minimum required items
    if (!selectedItems.tops || !selectedItems.bottoms) {
      alert('An outfit requires at least a top and bottom!');
      return;
    }

    const newOutfit = {
      id: Date.now().toString(),
      name: outfitDetails.name || 'Unnamed Outfit',
      items: selectedItems,
      occasion: outfitDetails.occasion,
      notes: outfitDetails.notes,
      createdAt: new Date().toISOString()
    };

    onSave(newOutfit);
  };

  // Render selection panel
  const renderSelectionPanel = () => {
    if (!showSelectionPanel || !currentSelection) return null;

    const items = getItemsByCategory(currentSelection);

    return (
      <div className="item-selection-panel">
        <div className="panel-header">
          <h4>Select {currentSelection}</h4>
          <button className="close-panel" onClick={closeSelectionPanel}>×</button>
        </div>
        <div className="item-selection-grid">
          {items.length === 0 ? (
            <p>No {currentSelection} items found in your wardrobe.</p>
          ) : (
            items.map(item => (
              <div 
                key={item.addedAt} 
                className="selection-item" 
                onClick={() => selectItem(item)}
              >
                <img 
                  src={item.imageUrl} 
                  alt={item.title || currentSelection} 
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                  }}
                />
                <p className="selection-item-title">{item.title || 'Unnamed item'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="outfit-creator">
      <div className="outfit-creator-header">
        <h3>Create New Outfit</h3>
        <button className="icon-button" onClick={onClose}>×</button>
      </div>
      
      <div className="outfit-builder">
        <div className="outfit-items">
          {['tops', 'bottoms', 'shoes', 'outerwear', 'accessories'].map(category => {
            const item = selectedItems[category];
            const isRequired = category === 'tops' || category === 'bottoms';
            
            return (
              <div 
                key={category}
                className="outfit-item-slot" 
                onClick={() => openSelectionPanel(category)}
              >
                <div className="slot-label">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                  {isRequired && <span className="required">*</span>}
                </div>
                
                <div className={`slot-content ${!item ? 'empty' : ''}`}>
                  {item ? (
                    <>
                      <img src={item.imageUrl} alt={item.title || category} />
                      <button 
                        className="remove-item-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(category);
                        }}
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <div className="add-item-placeholder">
                      <span>+</span>
                      <p>Add {category}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="outfit-details">
          <div className="form-group">
            <label htmlFor="outfit-name">Outfit Name</label>
            <input
              type="text"
              id="outfit-name"
              name="name"
              value={outfitDetails.name}
              onChange={handleDetailChange}
              placeholder="e.g., Summer Casual"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="outfit-occasion">Occasion</label>
            <select
              id="outfit-occasion"
              name="occasion"
              value={outfitDetails.occasion}
              onChange={handleDetailChange}
            >
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
              <option value="work">Work</option>
              <option value="date">Date Night</option>
              <option value="sports">Sports/Active</option>
              <option value="special">Special Occasion</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="outfit-notes">Notes</label>
            <textarea
              id="outfit-notes"
              name="notes"
              value={outfitDetails.notes}
              onChange={handleDetailChange}
              placeholder="Any notes or thoughts about this outfit..."
              rows="4"
            ></textarea>
          </div>
          
          <div className="form-actions">
            <button
              className="primary-button"
              onClick={saveOutfit}
              disabled={!selectedItems.tops || !selectedItems.bottoms}
            >
              Save Outfit
            </button>
            <button
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      
      {renderSelectionPanel()}
    </div>
  );
};

export default OutfitCreator;