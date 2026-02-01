import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'stock-dashboard-watchlists';

// Default watchlists
const DEFAULT_WATCHLISTS = {
  'default': {
    id: 'default',
    name: 'My Watchlist',
    stocks: ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK'],
    createdAt: Date.now()
  }
};

function WatchlistManager({ currentStocks, onWatchlistChange, onStocksChange }) {
  const [watchlists, setWatchlists] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_WATCHLISTS;
  });
  const [activeWatchlistId, setActiveWatchlistId] = useState('default');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const dropdownRef = useRef(null);
  const editInputRef = useRef(null);

  // Save to localStorage whenever watchlists change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlists));
  }, [watchlists]);

  // Update current watchlist's stocks when they change externally
  useEffect(() => {
    if (currentStocks && activeWatchlistId) {
      setWatchlists(prev => ({
        ...prev,
        [activeWatchlistId]: {
          ...prev[activeWatchlistId],
          stocks: currentStocks
        }
      }));
    }
  }, [currentStocks, activeWatchlistId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const activeWatchlist = watchlists[activeWatchlistId];

  const switchWatchlist = (id) => {
    setActiveWatchlistId(id);
    onStocksChange(watchlists[id].stocks);
    onWatchlistChange(id);
    setShowDropdown(false);
  };

  const createWatchlist = () => {
    if (!newWatchlistName.trim()) return;
    
    const id = `watchlist-${Date.now()}`;
    const newWatchlist = {
      id,
      name: newWatchlistName.trim(),
      stocks: [],
      createdAt: Date.now()
    };
    
    setWatchlists(prev => ({
      ...prev,
      [id]: newWatchlist
    }));
    
    setActiveWatchlistId(id);
    onStocksChange([]);
    onWatchlistChange(id);
    setNewWatchlistName('');
    setShowCreateModal(false);
    setShowDropdown(false);
  };

  const deleteWatchlist = (id, e) => {
    e.stopPropagation();
    
    if (Object.keys(watchlists).length <= 1) {
      alert('You must have at least one watchlist');
      return;
    }
    
    if (!confirm(`Delete "${watchlists[id].name}"? This cannot be undone.`)) {
      return;
    }
    
    const newWatchlists = { ...watchlists };
    delete newWatchlists[id];
    setWatchlists(newWatchlists);
    
    // Switch to first available watchlist if we deleted the active one
    if (id === activeWatchlistId) {
      const firstId = Object.keys(newWatchlists)[0];
      setActiveWatchlistId(firstId);
      onStocksChange(newWatchlists[firstId].stocks);
      onWatchlistChange(firstId);
    }
  };

  const startEditing = (id, name, e) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingName(name);
  };

  const saveEdit = (id) => {
    if (editingName.trim()) {
      setWatchlists(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          name: editingName.trim()
        }
      }));
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleEditKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      saveEdit(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingName('');
    }
  };

  const duplicateWatchlist = (id, e) => {
    e.stopPropagation();
    const source = watchlists[id];
    const newId = `watchlist-${Date.now()}`;
    const newWatchlist = {
      id: newId,
      name: `${source.name} (Copy)`,
      stocks: [...source.stocks],
      createdAt: Date.now()
    };
    
    setWatchlists(prev => ({
      ...prev,
      [newId]: newWatchlist
    }));
  };

  const saveCurrentAsNew = () => {
    const id = `watchlist-${Date.now()}`;
    const newWatchlist = {
      id,
      name: `Scan Results ${new Date().toLocaleDateString('en-IN')}`,
      stocks: currentStocks,
      createdAt: Date.now()
    };
    
    setWatchlists(prev => ({
      ...prev,
      [id]: newWatchlist
    }));
    
    setActiveWatchlistId(id);
    onWatchlistChange(id);
    setShowDropdown(false);
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      {/* Main Watchlist Selector */}
      <div style={{ 
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          {/* Watchlist Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.95rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: 'var(--radius-sm)', 
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem'
                }}>📋</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '600' }}>{activeWatchlist?.name || 'Select Watchlist'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {activeWatchlist?.stocks?.length || 0} stocks
                  </div>
                </div>
              </div>
              <span style={{ 
                transform: showDropdown ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
                color: 'var(--text-muted)'
              }}>▼</span>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '8px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                zIndex: 1000,
                boxShadow: 'var(--shadow-lg)'
              }}>
                {/* Watchlist Items */}
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {Object.values(watchlists)
                    .sort((a, b) => a.createdAt - b.createdAt)
                    .map((wl) => (
                      <div
                        key={wl.id}
                        onClick={() => switchWatchlist(wl.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          cursor: 'pointer',
                          background: wl.id === activeWatchlistId ? 'var(--bg-secondary)' : 'transparent',
                          borderLeft: wl.id === activeWatchlistId ? '3px solid var(--accent-primary)' : '3px solid transparent',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (wl.id !== activeWatchlistId) {
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (wl.id !== activeWatchlistId) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {editingId === wl.id ? (
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onBlur={() => saveEdit(wl.id)}
                              onKeyDown={(e) => handleEditKeyDown(e, wl.id)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                background: 'var(--bg-secondary)',
                                border: '2px solid var(--accent-primary)',
                                borderRadius: '4px',
                                color: 'var(--text-primary)',
                                fontSize: '0.95rem',
                                outline: 'none'
                              }}
                            />
                          ) : (
                            <>
                              <div style={{ fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                                {wl.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {wl.stocks.length} stocks
                              </div>
                            </>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '4px', marginLeft: '10px' }}>
                          <button
                            onClick={(e) => startEditing(wl.id, wl.name, e)}
                            title="Rename"
                            style={{
                              padding: '6px 8px',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              fontSize: '0.9rem'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => duplicateWatchlist(wl.id, e)}
                            title="Duplicate"
                            style={{
                              padding: '6px 8px',
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              fontSize: '0.9rem'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                          >
                            📄
                          </button>
                          {Object.keys(watchlists).length > 1 && (
                            <button
                              onClick={(e) => deleteWatchlist(wl.id, e)}
                              title="Delete"
                              style={{
                                padding: '6px 8px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                fontSize: '0.9rem'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = '#FEE2E2';
                                e.target.style.color = 'var(--accent-red)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                                e.target.style.color = 'var(--text-muted)';
                              }}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Create New Button */}
                <div style={{ borderTop: '1px solid var(--border-light)', padding: '8px' }}>
                  <button
                    onClick={() => {
                      setShowCreateModal(true);
                      setShowDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      background: 'var(--accent-primary)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem'
                    }}
                  >
                    + New Watchlist
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={saveCurrentAsNew}
              title="Save current stocks as new watchlist"
              style={{
                padding: '12px 20px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9rem'
              }}
            >
              Save As New
            </button>
          </div>
        </div>

        {/* Stock Count Badge */}
        <div style={{ 
          marginTop: '12px', 
          display: 'flex', 
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.85rem',
          color: 'var(--text-muted)'
        }}>
          <span>
            📊 {Object.keys(watchlists).length} watchlist{Object.keys(watchlists).length > 1 ? 's' : ''}
          </span>
          <span>•</span>
          <span>
            Currently viewing: <strong style={{ color: 'var(--accent-primary)' }}>{activeWatchlist?.name}</strong>
          </span>
        </div>
      </div>

      {/* Create New Watchlist Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-md)',
              padding: '28px',
              width: '100%',
              maxWidth: '400px',
              margin: '20px',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              margin: '0 0 20px 0', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              color: 'var(--text-primary)',
              fontWeight: '600'
            }}>
              Create New Watchlist
            </h3>
            
            <input
              type="text"
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createWatchlist()}
              placeholder="Enter watchlist name..."
              autoFocus
              style={{
                width: '100%',
                padding: '14px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                marginBottom: '20px',
                outline: 'none'
              }}
            />
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={createWatchlist}
                disabled={!newWatchlistName.trim()}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: newWatchlistName.trim() ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: newWatchlistName.trim() ? 'white' : 'var(--text-muted)',
                  cursor: newWatchlistName.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: '600'
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WatchlistManager;
