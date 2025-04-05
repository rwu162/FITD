import { useState, useEffect } from 'react';
import './App.css';
import './style.css';
import './styling.css';

function App() {
  const [wardrobe, setWardrobe] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  // Load wardrobe on component mount
  useEffect(() => {
    loadWardrobe();
  }, []);

  // Load wardrobe from Chrome storage
  const loadWardrobe = async () => {
    setLoading(true);
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get('wardrobe', (data) => {
          console.log('Loaded wardrobe data:', data.wardrobe);
          setWardrobe(data.wardrobe || []);
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

  // Open outfit creator
  const openOutfitCreator = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ 
        action: 'openFullPage',
        navigateTo: 'outfit' // Pass parameter to navigate to outfit tab
      });
    } else {
      setMessage({ type: 'error', text: 'Full page view is only available in the extension.' });
    }
  };

  // Show instruction message for adding clothing
  const showAddInstructions = () => {
    setMessage({ 
      type: 'info', 
      text: 'To add items to your wardrobe, right-click on clothing images while browsing and select "Add to Virtual Closet".' 
    });
    
    // Clear message after 5 seconds
    setTimeout(() => {
      setMessage(null);
    }, 5000);
  };

  return (
    <div className="app compact-style">
      <header className="app-header">
        <h1 className="brand-logo">WEARHAUS</h1>
        <div className="header-actions">
          <button 
            className="add-btn" 
            onClick={showAddInstructions}
          >
            Add Clothing
          </button>
          {/* Removed settings button and user dot */}
        </div>
      </header>
      
      <div className="nav-buttons">
        <button 
          className="nav-button"
          onClick={openOutfitCreator}
        >
          STYLER
        </button>
        <button 
          className="nav-button"
          onClick={openFullPage}
        >
          WARDROBE
        </button>
      </div>
      
      <div className="app-footer">
        <div className="footer-text">
          New to Wearhaus? <a href="#" className="footer-link">Learn how to use Wearhaus</a>
        </div>
      </div>
      
      {message && (
        <div className={`message ${message.type} notification-message`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

export default App;