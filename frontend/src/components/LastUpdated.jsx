import Icon from './Icon';

/**
 * LastUpdated Component
 * Displays the timestamp of when data was last fetched
 */
function LastUpdated({ timestamp, variant = 'inline', showIcon = true }) {
  if (!timestamp) return null;

  const formatTimestamp = (ts) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    // Format time
    const timeStr = date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    // Format date
    const dateStr = date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    // Relative time
    let relativeStr = '';
    if (diffMins < 1) {
      relativeStr = 'just now';
    } else if (diffMins < 60) {
      relativeStr = `${diffMins}m ago`;
    } else if (diffHours < 24) {
      relativeStr = `${diffHours}h ago`;
    } else {
      relativeStr = dateStr;
    }

    return { timeStr, dateStr, relativeStr, fullStr: `${dateStr} at ${timeStr}` };
  };

  const { timeStr, dateStr, relativeStr, fullStr } = formatTimestamp(timestamp);

  // Compact inline variant
  if (variant === 'inline') {
    return (
      <span 
        style={{ 
          fontSize: '0.75rem', 
          color: 'var(--text-muted)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}
        title={fullStr}
      >
        {showIcon && <Icon name="schedule" size={12} />}
        {relativeStr}
      </span>
    );
  }

  // Badge variant for headers
  if (variant === 'badge') {
    return (
      <div 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)'
        }}
        title={fullStr}
      >
        {showIcon && <Icon name="schedule" size={14} />}
        <span>Updated {relativeStr}</span>
      </div>
    );
  }

  // Full variant with date and time
  if (variant === 'full') {
    return (
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}
      >
        {showIcon && <Icon name="schedule" size={16} />}
        <div>
          <div style={{ fontWeight: '500' }}>{timeStr}</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{dateStr}</div>
        </div>
      </div>
    );
  }

  // Card footer variant
  if (variant === 'footer') {
    return (
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '6px',
          padding: '8px 0 0',
          marginTop: '12px',
          borderTop: '1px solid var(--border-light)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)'
        }}
        title={fullStr}
      >
        {showIcon && <Icon name="update" size={12} />}
        Last updated: {relativeStr}
      </div>
    );
  }

  return null;
}

export default LastUpdated;
