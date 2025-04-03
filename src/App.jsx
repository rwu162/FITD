import { useState, useEffect } from 'react';
import './App.css';
import './style.css';
import './styling.css';

function App() {
  const [tab, setTab] = useState('wardrobe'); // 'wardrobe', 'outfits', 'add'
  const [wardrobe, setWardrobe] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  // Current category for filtering
  const [filteredCategory, setFilteredCategory] = useState('all');
  
  // Load wardrobe data on component mount
  useEffect(() => {
    loadWardrobe();
  }, []);

  // Load wardrobe from Chrome storage
  const loadWardrobe = async () => {
    setLoading(true);
    try {
      // Check if chrome.storage is available (in extension environment)
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get('wardrobe', (data) => {
          console.log('Loaded wardrobe data:', data.wardrobe);
          setWardrobe(data.wardrobe || []);
          setLoading(false);
        });
      } else {
        console.warn('Chrome storage not available. Using mock data.');
        // Mock data for development outside extension
        setWardrobe([]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading wardrobe:', error);
      setMessage({ type: 'error', text: 'Failed to load your wardrobe.' });
      setLoading(false);
    }
  };

  // Delete an item from the wardrobe
  const handleDeleteItem = (timestamp) => {
    if (confirm('Are you sure you want to remove this item from your wardrobe?')) {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get('wardrobe', (data) => {
          const updatedWardrobe = (data.wardrobe || []).filter(
            item => item.addedAt !== timestamp
          );
          
          chrome.storage.local.set({ wardrobe: updatedWardrobe }, () => {
            setWardrobe(updatedWardrobe);
            setMessage({ type: 'success', text: 'Item removed from your wardrobe.' });
            
            // Clear message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
          });
        });
      }
    }
  };

  // Open the full page view
  const openFullPage = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'openFullPage' });
    } else {
      setMessage({ type: 'error', text: 'Full page view is only available in the extension.' });
    }
  };

  // Filter items by category
  const getFilteredItems = () => {
    if (filteredCategory === 'all') {
      return wardrobe;
    }
    return wardrobe.filter(item => item.category === filteredCategory);
  };

  // Render item card
  const renderItemCard = (item) => (
    <div className="item-card popup-item-card" key={item.addedAt} data-category={item.category}>
      {item.imageUrl && (
        <div className="item-image popup-item-image">
          <img 
            src={item.imageUrl} 
            alt={item.title || 'Product image'} 
            onError={(e) => {
              console.error('Image failed to load:', item.imageUrl);
              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>
      )}
      <div className="item-details">
        <h3>{item.title || 'Unknown Product'}</h3>
        {item.brand && <p className="item-brand">{item.brand}</p>}
        {item.price && <p className="item-price">{item.price}</p>}
        <p className="item-category">{item.category || 'Uncategorized'}</p>
        <button 
          className="secondary-button mt-2"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteItem(item.addedAt);
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );

  // Render wardrobe tab
  const renderWardrobe = () => {
    if (loading) return <div className="loading">Loading your wardrobe...</div>;
    
    const filteredItems = getFilteredItems();
    
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
          <p>No items in the {filteredCategory} category yet.</p>
        </div>
      );
    }
    
    return (
      <div className="wardrobe-container">
        <div className="filter-controls">
          <div className="filter-dropdown">
            <select 
              value={filteredCategory}
              onChange={(e) => setFilteredCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="tops">Tops</option>
              <option value="bottoms">Bottoms</option>
              <option value="shoes">Shoes</option>
              <option value="dresses">Dresses</option>
              <option value="outerwear">Outerwear</option>
              <option value="accessories">Accessories</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <button className="primary-button" onClick={openFullPage}>
            Open Full View
          </button>
        </div>
      
        <div className="popup-items-grid">
          {filteredItems.map(renderItemCard)}
        </div>
      </div>
    );
  };

  // Render add tab
  const renderAddTab = () => (
    <div className="add-tab">
      <h2>Add to Your Wardrobe</h2>
      <p>To add clothing items to your wardrobe, simply right-click on any clothing image while browsing and select "Add to Virtual Closet" from the context menu.</p>
      
      <div className="add-method mt-3">
        <p>Browse your favorite clothing websites and use the right-click menu to quickly add items.</p>
      </div>
      
      <button 
        className="primary-button mt-3"
        onClick={openFullPage}
      >
        Open Full View
      </button>
      
      {message && (
        <div className={`message ${message.type} mt-3`}>
          {message.text}
        </div>
      )}
    </div>
  );

  // Render outfits tab (placeholder for now)
  const renderOutfits = () => (
    <div className="outfits-tab">
      <h2>Your Outfits</h2>
      <p>View and create outfits from your wardrobe items.</p>
      <button className="primary-button mt-3" onClick={openFullPage}>
        Open Full View
      </button>
    </div>
  );

  return (
    <div className="app">
      {/* New navigation styling */}
      <header className="popup-header">
        <h1 className="title">WARDROBE</h1>
      </header>
      
      <div className="popup-content">
        {tab === 'wardrobe' && renderWardrobe()}
        {tab === 'outfits' && renderOutfits()}
        {tab === 'add' && renderAddTab()}
      </div>
      
      <nav className="nav-container">
        <ul className="nav-links">
          <li className={tab === 'wardrobe' ? 'active' : ''}>
            <a href="#" onClick={(e) => { e.preventDefault(); setTab('wardrobe'); }}>
              Wardrobe
            </a>
          </li>
          <li className={tab === 'outfits' ? 'active' : ''}>
            <a href="#" onClick={(e) => { e.preventDefault(); setTab('outfits'); }}>
              Outfits
            </a>
          </li>
          <li className={tab === 'add' ? 'active' : ''}>
            <a href="#" onClick={(e) => { e.preventDefault(); setTab('add'); }}>
              Add
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default App;