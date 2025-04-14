import { useState, useEffect } from 'react';
import './App.css';
import './style.css';
import './styling.css';

function App() {
  const [activeTab, setActiveTab] = useState('add');
  const [wardrobe, setWardrobe] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentCategory, setCurrentCategory] = useState('all');
  const [filteredItems, setFilteredItems] = useState([]);
  
  // Load wardrobe on component mount
  useEffect(() => {
    loadWardrobe();
  }, []);

  // Effect to filter items when category or wardrobe changes
  useEffect(() => {
    if (wardrobe.length > 0) {
      if (currentCategory === 'all') {
        setFilteredItems(wardrobe);
      } else {
        const filtered = wardrobe.filter(item => item.category === currentCategory);
        setFilteredItems(filtered);
      }
    }
  }, [currentCategory, wardrobe]);

  // Load wardrobe from Chrome storage
  const loadWardrobe = async () => {
    setLoading(true);
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get('wardrobe', (data) => {
          console.log('Loaded wardrobe data:', data.wardrobe);
          setWardrobe(data.wardrobe || []);
          setFilteredItems(data.wardrobe || []);
          setLoading(false);
        });
      } else {
        console.warn('Chrome storage not available. Using mock data.');
        setWardrobe([]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading wardrobe:', error);
      setMessage({ type: 'error', text: 'Failed to load your wardrobe.' });
      setLoading(false);
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

  // Open outfit creator in full page
  const openOutfitCreator = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ 
        action: 'openOutfitCreator',
        navigateTo: 'category-selector'  // Make sure this is exactly 'category-selector'
      });
    } else {
      setMessage({ type: 'error', text: 'Full page view is only available in the extension.' });
    }
  };

  // Handle category change
  const handleCategoryChange = (e) => {
    setCurrentCategory(e.target.value);
  };

  // Render the add tab content
  const renderAddTab = () => {
    return (
      <div className="add-tab">
        <h1>Add to Your Wardrobe</h1>
        
        <p>
          To add clothing items to your wardrobe, simply right-click on 
          any clothing image while browsing and select "Add to fitd 
          closet" from the context menu.
        </p>
        
        <p>
          Browse your favorite clothing websites and use the right-click 
          menu to quickly add items.
        </p>
        
        <button 
          className="full-view-button"
          onClick={openFullPage}
        >
          OPEN IN FULL VIEW
        </button>
      </div>
    );
  };

  // Render the wardrobe tab content
  const renderWardrobeTab = () => {
    if (loading) {
      return <div className="loading">Loading your wardrobe...</div>;
    }
    
    if (wardrobe.length === 0) {
      return (
        <div className="empty-state">
          <p>Your wardrobe is empty. Add items by right-clicking on clothing images while browsing.</p>
          
          <button 
            className="full-view-button"
            onClick={openFullPage}
          >
            OPEN IN FULL VIEW
          </button>
        </div>
      );
    }
    
    return (
      <div className="wardrobe-tab">
        <div className="controls-row">
          <div className="category-select">
            <select onChange={handleCategoryChange} value={currentCategory}>
              <option value="all">All Categories</option>
              <option value="tops">Tops</option>
              <option value="bottoms">Bottoms</option>
              <option value="dresses">Dresses</option>
              <option value="shoes">Shoes</option>
              <option value="outerwear">Outerwear</option>
              <option value="accessories">Accessories</option>
            </select>
          </div>
          <button 
            className="view-in-full-btn"
            onClick={openFullPage}
          >
            VIEW IN FULL VIEW
          </button>
        </div>
        
        <div className="wardrobe-items">
          {filteredItems.map(item => (
            <div className="wardrobe-item-card" key={item.addedAt}>
              <div className="item-image">
                <img 
                  src={item.imageUrl} 
                  alt={item.title || "Clothing item"} 
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%23f0f0f0"/%3E%3Ctext x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage not available%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
              <div className="item-details">
                <h3 className="item-title">{item.title || "Untitled Item"}</h3>
                <p className="item-brand">{item.brand || ''}</p>
                <p className="item-price">{item.price || ''}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render the styler tab content
  const renderStylerTab = () => {
    return (
      <div className="styler-tab">
        <p>
          Ready to get to styling? Mix and match your favorite pieces now.
        </p>
        
        <button 
          className="full-view-button"
          onClick={openOutfitCreator}
        >
          OPEN STYLER
        </button>
      </div>
    );
  };

  return (
    <div className="app fitd-style">
      <header className="app-header">
        <h1 className="brand-logo">FITD</h1>
      </header>
      
      <main className="app-content">
        {activeTab === 'add' && renderAddTab()}
        {activeTab === 'styler' && renderStylerTab()}
        {activeTab === 'wardrobe' && renderWardrobeTab()}
      </main>
      
      <nav className="bottom-nav">
      <button 
        className={`nav-tab ${activeTab === 'add' ? 'active' : ''}`}
        onClick={() => setActiveTab('add')}
      >
        ADD
      </button>
      <button 
        className={`nav-tab ${activeTab === 'wardrobe' ? 'active' : ''}`}
        onClick={() => setActiveTab('wardrobe')}
      >
        WARDROBE
      </button>
      <button 
        className={`nav-tab ${activeTab === 'styler' ? 'active' : ''}`}
        onClick={() => setActiveTab('styler')}
      >
        STYLER
      </button>
    </nav>

      
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

export default App;