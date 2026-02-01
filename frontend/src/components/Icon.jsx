/**
 * Material Symbols Icon Component
 * Uses Google Material Symbols Outlined
 */
function Icon({ name, size = 20, className = '', style = {}, filled = false }) {
  return (
    <span 
      className={`material-symbols-outlined ${className}`}
      style={{ 
        fontSize: `${size}px`,
        fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
        verticalAlign: 'middle',
        ...style 
      }}
    >
      {name}
    </span>
  );
}

// Common icon mappings for the app
export const ICONS = {
  // Navigation & Actions
  dashboard: 'dashboard',
  signals: 'star',
  intelligence: 'psychology',
  risk: 'calculate',
  refresh: 'refresh',
  search: 'search',
  add: 'add',
  remove: 'remove',
  close: 'close',
  check: 'check',
  warning: 'warning',
  error: 'error',
  info: 'info',
  
  // Market & Trading
  trendingUp: 'trending_up',
  trendingDown: 'trending_down',
  chart: 'show_chart',
  analytics: 'analytics',
  target: 'gps_fixed',
  money: 'payments',
  wallet: 'account_balance_wallet',
  
  // Status
  success: 'check_circle',
  fail: 'cancel',
  pending: 'pending',
  live: 'circle',
  
  // UI Elements
  list: 'list',
  grid: 'grid_view',
  expand: 'expand_more',
  collapse: 'expand_less',
  menu: 'menu',
  settings: 'settings',
  edit: 'edit',
  delete: 'delete',
  copy: 'content_copy',
  save: 'save',
  
  // Content
  lightbulb: 'lightbulb',
  rocket: 'rocket_launch',
  celebration: 'celebration',
  beach: 'beach_access',
  schedule: 'schedule',
  bookmark: 'bookmark',
  bookmarkAdd: 'bookmark_add',
  visibility: 'visibility'
};

export default Icon;
