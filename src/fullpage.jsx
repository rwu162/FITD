import React, { useState, useEffect } from 'react';
import './fullpage.css';
import './styling.css';
import './style.css';
import './tops.css';
import './outfit-creator.css';
import OutfitCreator from './OutfitCreator';

function VirtualClosetFullPage() {
  // State management
  const [currentTab, setCurrentTab] = useState('wardrobe');
  const [currentCategory, setCurrentCategory] = useState('all');
  const [wardrobe, setWardrobe] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [outfits, setOutfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showOutfitCreator, setShowOutfitCreator] = useState(false);
  const [activeTabId, setActiveTabId] = useState('wardrobe-tab-menu');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortOptions, setShowSortOptions] = useState(false);

  // Load wardrobe on component mount
  // Load wardrobe on component mount (runs once)
  useEffect(() => {
    // Check URL parameters for navigation
    const queryParams = new URLSearchParams(window.location.search);
    const tabParam = queryParams.get('tab');
    
    if (tabParam) {
      // Set the correct tab based on URL parameter
      setCurrentTab(tabParam);
      setActiveTabId(`${tabParam}-tab-menu`);
      
      if (tabParam === 'outfit') {
        // Auto-open the outfit creator if that's the requested tab
        setShowOutfitCreator(true);
      }
    }
    loadWardrobe();
    loadOutfits();
  }, []);

  // Filter and sort
  useEffect(() => {
    let items = [...wardrobe];

    // Apply category filter
    if (currentCategory !== 'all') {
      items = items.filter(item => item.category === currentCategory);
    }
  
    // Apply search filter if there's a query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => {
        const searchableText = `${item.title || ''} ${item.brand || ''} ${item.description || ''}`.toLowerCase();
        return searchableText.includes(query);
      });
    }
  
    // Sort the items
    items = sortItems(items);
    
    setFilteredItems(items);
  }, [currentCategory, searchQuery, wardrobe, sortBy]);

  // Toggle sort options
const toggleSortOptions = () => {
  setShowSortOptions(!showSortOptions);
};

// Handle sort option click
const handleSortOptionClick = (option) => {
  setSortBy(option);
  setShowSortOptions(false);
};

  // Load wardrobe from Chrome storage
  const loadWardrobe = () => {
    setLoading(true);
    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'getWardrobe' }, (response) => {
        if (response && response.success) {
          setWardrobe(response.wardrobe || []);
        } else {
          console.error('Failed to load wardrobe data');
        }
        setLoading(false);
      });
    } else {
      // For development outside extension
      console.warn('Chrome runtime not available. Using empty wardrobe for development.');
      setWardrobe([]);
      setLoading(false);
    }
  };

  // Load outfits from Chrome storage
  const loadOutfits = () => {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['outfits'], (data) => {
        setOutfits(data.outfits || []);
      });
    } else {
      // For development outside extension
      setOutfits([]);
    }
  };

  // Filter wardrobe items based on category and search query
  const filterItems = () => {
    let items = [...wardrobe];

    // Apply category filter
    if (currentCategory !== 'all') {
      items = items.filter(item => item.category === currentCategory);
    }

    // Apply search filter if there's a query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => {
        const searchableText = `${item.title || ''} ${item.brand || ''} ${item.description || ''}`.toLowerCase();
        return searchableText.includes(query);
      });
    }

    setFilteredItems(items);
    
    // For debugging
    console.log(`Filtered to ${items.length} items with category: ${currentCategory}`);
  };

  // Handle tab switching
  const switchTab = (tabId, viewId) => {
    setCurrentTab(tabId);
    if (tabId === 'wardrobe') {
      setCurrentCategory('all');
    }
    setActiveTabId(`${tabId}-tab-menu`);
  };

  // Handle category selection
  const switchCategory = (category) => {
    setCurrentCategory(category);
    setActiveTabId(`${category}-tab-menu`);
  };

  // Handle search input
  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  // Open item details modal
  const openItemModal = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  // Close item details modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  // Delete an item from wardrobe
  const deleteItem = (itemId) => {
    if (window.confirm('Are you sure you want to remove this item from your wardrobe?')) {
      const updatedWardrobe = wardrobe.filter(item => item.addedAt !== itemId);
      
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'updateWardrobe',
          wardrobe: updatedWardrobe
        }, (response) => {
          if (response && response.success) {
            setWardrobe(updatedWardrobe);
            closeModal();
          }
        });
      } else {
        // For development outside extension
        setWardrobe(updatedWardrobe);
        closeModal();
      }
    }
  };

  // Start outfit creation
  const startOutfitCreation = () => {
    setShowOutfitCreator(true);
  };

  // Close outfit creator
  const closeOutfitCreator = () => {
    setShowOutfitCreator(false);
  };

  const renderFilterControls = () => {
    return (
      <div className="filter-controls">
        <div className="filter-left">
          <div className={`sort-container ${showSortOptions ? 'active' : ''}`}>
            <div className="sort-header" onClick={toggleSortOptions}>
              <span className="sort-text">Sort By</span>
              <span className="sort-icon">▼</span>
            </div>
            <div className="sort-options expanded">
              <div 
                className={`sort-option ${sortBy === 'newest' ? 'active' : ''}`}
                onClick={() => handleSortOptionClick('newest')}
              >
                Newest
              </div>
              <div 
                className={`sort-option ${sortBy === 'oldest' ? 'active' : ''}`}
                onClick={() => handleSortOptionClick('oldest')}
              >
                Oldest
              </div>
              <div 
                className={`sort-option ${sortBy === 'price-low-high' ? 'active' : ''}`}
                onClick={() => handleSortOptionClick('price-low-high')}
              >
                Price: Low to High
              </div>
              <div 
                className={`sort-option ${sortBy === 'price-high-low' ? 'active' : ''}`}
                onClick={() => handleSortOptionClick('price-high-low')}
              >
                Price: High to Low
              </div>
              <div 
                className={`sort-option ${sortBy === 'favorites' ? 'active' : ''}`}
                onClick={() => handleSortOptionClick('favorites')}
              >
                Favorites
              </div>
            </div>
          </div>
        </div>
        
        <div className="filter-right">
          <div className="search-container">
            <input 
              type="text" 
              id="search-wardrobe" 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          {/* Category dropdown removed */}
        </div>
      </div>
    );
  };
  
  // Save a new outfit
  const saveOutfit = (newOutfit) => {
    const updatedOutfits = [...outfits, newOutfit];
    
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ outfits: updatedOutfits }, () => {
        setOutfits(updatedOutfits);
        setShowOutfitCreator(false);
      });
    } else {
      // For development outside extension
      setOutfits(updatedOutfits);
      setShowOutfitCreator(false);
    }
  };
  
  // Delete an outfit
  const deleteOutfit = (outfitId) => {
    if (window.confirm('Are you sure you want to delete this outfit?')) {
      const updatedOutfits = outfits.filter(outfit => outfit.id !== outfitId);
      
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ outfits: updatedOutfits }, () => {
          setOutfits(updatedOutfits);
        });
      } else {
        // For development outside extension
        setOutfits(updatedOutfits);
      }
    }
  };

  // Render wardrobe items
  const renderWardrobeItems = () => {
    if (loading) {
      return <div className="loading">Loading your wardrobe...</div>;
    }

    if (wardrobe.length === 0) {
      return (
        <div className="empty-state">
          <p>Your wardrobe is empty. Add items by right-clicking on clothing images while browsing.</p>
        </div>
      );
    }

    if (filteredItems.length === 0) {
      return (
        <div className="empty-state">
          <p>No items found in this category. Try adding some or changing your filter.</p>
        </div>
      );
    }

    return (
      <div className="items-grid-container">
        {filteredItems.map(item => (
          <div className="item-card" key={item.addedAt} data-category={item.category} onClick={() => openItemModal(item)}>
            <div className="item-image">
              <img 
                src={item.imageUrl} 
                alt={item.title || 'Product image'} 
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
            <div className="item-details">
              <h3>{item.title || 'Unknown Product'}</h3>
              {item.brand && <p className="item-brand">{item.brand}</p>}
              {item.price && <p className="item-price">{item.price}</p>}
              <p className="item-category">Category: {item.category || 'Uncategorized'}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render outfits
  const renderOutfits = () => {
    if (outfits.length === 0) {
      return (
        <div className="empty-state">
          <p>You haven't created any outfits yet. Start by clicking "Create New Outfit".</p>
        </div>
      );
    }

    return (
      <div className="outfits-grid">
        {outfits.map(outfit => {
          const outfitItems = Object.entries(outfit.items)
            .filter(([_, item]) => item !== null)
            .map(([type, item]) => (
              <div className="outfit-item-thumbnail" key={type} data-category={type}>
                <img 
                  src={item.imageUrl} 
                  alt={item.title || type} 
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
            ));

          return (
            <div className="outfit-card" key={outfit.id}>
              <div className="outfit-name">
                <h3>{outfit.name}</h3>
              </div>
              <div className="outfit-items-grid">
                {outfitItems}
              </div>
              <div className="outfit-footer">
                <span className="outfit-created-date">{new Date(outfit.createdAt).toLocaleDateString()}</span>
                <button className="icon-button delete-outfit" onClick={(e) => {
                  e.stopPropagation();
                  deleteOutfit(outfit.id);
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render "Add" section
  const renderAddView = () => {
    return (
      <div className="add-container">
        <h2>Add to Your Wardrobe</h2>
        <p>To add items to your wardrobe, simply use the right-click method:</p>
        
        <div className="add-method-card">
          <h3>Right-Click on Images</h3>
          <p>When browsing shopping websites, right-click on any clothing image and select "Add to Virtual Closet" from the context menu.</p>
        </div>
      </div>
    );
  };

  const sortItems = (items) => {
    if (!items || items.length === 0) return [];
    
    const sortedItems = [...items];
    
    switch (sortBy) {
      case 'price-low-high':
        return sortedItems.sort((a, b) => {
          const priceA = parseFloat(a.price?.replace(/[^\d.-]/g, '') || 0);
          const priceB = parseFloat(b.price?.replace(/[^\d.-]/g, '') || 0);
          return priceA - priceB;
        });
      case 'price-high-low':
        return sortedItems.sort((a, b) => {
          const priceA = parseFloat(a.price?.replace(/[^\d.-]/g, '') || 0);
          const priceB = parseFloat(b.price?.replace(/[^\d.-]/g, '') || 0);
          return priceB - priceA;
        });
      case 'oldest':
        return sortedItems.sort((a, b) => {
          return new Date(a.addedAt || 0) - new Date(b.addedAt || 0);
        });
      case 'newest':
        return sortedItems.sort((a, b) => {
          return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
        });
      case 'favorites':
        return sortedItems.sort((a, b) => {
          return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0);
        });
      default:
        return sortedItems;
    }
  };

  // Render item details modal
  const renderItemModal = () => {
    if (!showModal || !selectedItem) return null;

    const formattedDate = selectedItem.addedAt 
      ? new Date(selectedItem.addedAt).toLocaleDateString() 
      : 'Unknown';

    return (
      <div className={`modal ${showModal ? '' : 'hidden'}`}>
        <div className="modal-content">
          <div className="modal-header">
            <h3>{selectedItem.title || 'Item Details'}</h3>
            <button className="close-button" onClick={closeModal}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="item-image-container">
              <img 
                src={selectedItem.imageUrl} 
                alt="Item Image"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
            
            <div className="item-details">
              <div className="detail-row">
                <span className="detail-label">Brand:</span>
                <span className="detail-value">{selectedItem.brand || '-'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Price:</span>
                <span className="detail-value">{selectedItem.price || '-'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Category:</span>
                <span className="detail-value">{selectedItem.category || 'Uncategorized'}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Added:</span>
                <span className="detail-value">{formattedDate}</span>
              </div>
              
              <div className="detail-row full-width">
                <span className="detail-label">Description:</span>
                <p className="detail-value">{selectedItem.description || 'No description available.'}</p>
              </div>
              
              {selectedItem.detailedDescription && (
                <div className="detail-row full-width">
                  <span className="detail-label">Detailed Description:</span>
                  <p className="detail-value">{selectedItem.detailedDescription}</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="modal-footer">
            {selectedItem.url && (
              <a 
                href={selectedItem.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="secondary-button"
              >
                View Original
              </a>
            )}
            <button 
              className="danger-button"
              onClick={() => deleteItem(selectedItem.addedAt)}
            >
              Remove from Wardrobe
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="app" className='fullscreen-app'>
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="top-bar">
          <div className="logo">
            <img src="vite.svg" alt="Virtual Closet Logo" height="50px" />
          </div>
          <h1 className="title">WARDROBE</h1>
        </div>
        <div className="nav-container">
          <ul className="nav-links">
            <li id="wardrobe-tab-menu" className={activeTabId === 'wardrobe-tab-menu' ? 'active' : ''}>
              <a href="#wardrobe" onClick={(e) => {
                e.preventDefault();
                switchTab('wardrobe', 'wardrobe-view');
              }}>View All</a>
            </li>
            <li id="tops-tab-menu" className={activeTabId === 'tops-tab-menu' ? 'active' : ''}>
              <a href="#tops" onClick={(e) => {
                e.preventDefault();
                switchTab('wardrobe', 'wardrobe-view');
                switchCategory('tops');
              }}>Tops</a>
            </li>
            <li id="bottoms-tab-menu" className={activeTabId === 'bottoms-tab-menu' ? 'active' : ''}>
              <a href="#bottoms" onClick={(e) => {
                e.preventDefault();
                switchTab('wardrobe', 'wardrobe-view');
                switchCategory('bottoms');
              }}>Bottoms</a>
            </li>
            <li id="dresses-tab-menu" className={activeTabId === 'dresses-tab-menu' ? 'active' : ''}>
              <a href="#dresses" onClick={(e) => {
                e.preventDefault();
                switchTab('wardrobe', 'wardrobe-view');
                switchCategory('dresses');
              }}>Dresses/Jumpsuits</a>
            </li>
            <li id="shoes-tab-menu" className={activeTabId === 'shoes-tab-menu' ? 'active' : ''}>
              <a href="#shoes" onClick={(e) => {
                e.preventDefault();
                switchTab('wardrobe', 'wardrobe-view');
                switchCategory('shoes');
              }}>Shoes</a>
            </li>
            <li id="accessories-tab-menu" className={activeTabId === 'accessories-tab-menu' ? 'active' : ''}>
              <a href="#accessories" onClick={(e) => {
                e.preventDefault();
                switchTab('wardrobe', 'wardrobe-view');
                switchCategory('accessories');
              }}>Accessories</a>
            </li>
            <li id="outfit-tab-menu" className={activeTabId === 'outfit-tab-menu' ? 'active' : ''}>
              <a href="#outfits" onClick={(e) => {
                e.preventDefault();
                switchTab('outfit', 'outfits-view');
              }}>Outfits</a>
            </li>
            <li id="add-tab-menu" className={`heart ${activeTabId === 'add-tab-menu' ? 'active' : ''}`}>
              <a href="#add" onClick={(e) => {
                e.preventDefault();
                switchTab('add', 'add-view');
              }}>&#9825;</a>
            </li>
          </ul>
        </div>
      </nav>
      
      <main>
        {/* Wardrobe View */}
        <section id="wardrobe-view" className={currentTab === 'wardrobe' ? '' : 'hidden'}>
          {renderFilterControls()}
          {renderWardrobeItems()}
        </section>
        
        {/* Outfits View */}
        <section id="outfits-view" className={currentTab === 'outfit' ? '' : 'hidden'}>
          <div className="outfits-header">
            <h2>Your Outfits</h2>
            <button id="create-outfit-btn" className="primary-button" onClick={startOutfitCreation}>
              Create New Outfit
            </button>
          </div>
          
          <div id="outfits-container">
            {renderOutfits()}
          </div>
          
          {/* Outfit Creator (initially hidden) */}
          {showOutfitCreator && (
            <OutfitCreator 
              wardrobe={wardrobe}
              onClose={closeOutfitCreator}
              onSave={saveOutfit}
            />
          )}
        </section>
        
        {/* Add Item View */}
        <section id="add-view" className={currentTab === 'add' ? '' : 'hidden'}>
          {renderAddView()}
        </section>
      </main>
      
      {/* Item Details Modal */}
      {renderItemModal()}
    </div>
  );
}

export default VirtualClosetFullPage;