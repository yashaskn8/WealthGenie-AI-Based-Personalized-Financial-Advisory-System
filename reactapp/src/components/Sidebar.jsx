import React, { useState } from 'react';
import { Home, Target, BarChart3, TrendingUp, Calculator, Search, User, Bell, HelpCircle, ChevronLeft, ChevronRight, FileText, Gauge, PieChart } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import './Sidebar.css';

const NAV_GROUPS = [
  {
    title: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'health', label: 'Health Score', icon: Gauge },
      { id: 'goals', label: 'My Goals', icon: Target },
    ]
  },
  {
    title: 'ACTIVE TOOLS',
    items: [
      { id: 'rebalancer', label: 'Rebalancer', icon: BarChart3 },
      { id: 'sip-planner', label: 'SIP Step-Up', icon: TrendingUp },
      { id: 'allocation', label: 'Allocation Planner', icon: PieChart },
      { id: 'post-tax', label: 'Post-Tax Analysis', icon: FileText },
      { id: 'tax-optimizer', label: 'Tax Optimizer', icon: Calculator },
      { id: 'compare', label: 'Compare', icon: Search },
    ]
  },
  {
    title: 'ACCOUNT',
    items: [
      { id: 'profile', label: 'My Profile', icon: User },
    ]
  }
];

const Sidebar = ({ activePage, onNavigate, insightCount = 0 }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
        <div className="sidebar-brand">
          {!collapsed && <span className="sidebar-brand-text">WealthGenie</span>}
          <button className="sidebar-collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group, idx) => (
            <div key={idx} className="sidebar-group">
              {!collapsed && <div className="sidebar-group-title">{group.title}</div>}
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    className={`sidebar-item ${isActive ? 'sidebar-item--active' : ''}`}
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? item.label : ''}
                  >
                    {isActive && !collapsed && <div className="active-marker"></div>}
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className={`sidebar-item ${activePage === 'insights' ? 'sidebar-item--active' : ''}`}
            onClick={() => onNavigate('insights')}
            title={collapsed ? 'Insights' : ''}
          >
            {activePage === 'insights' && !collapsed && <div className="active-marker"></div>}
            <div style={{ position: 'relative' }}>
              <Bell size={18} strokeWidth={activePage === 'insights' ? 2.5 : 2} />
              {insightCount > 0 && (
                <span className="sidebar-badge">{insightCount}</span>
              )}
            </div>
            {!collapsed && <span className="sidebar-item-label">Insights</span>}
          </button>
          
          <button
            className={`sidebar-item ${activePage === 'help' ? 'sidebar-item--active' : ''}`}
            onClick={() => onNavigate('help')}
            title={collapsed ? 'Help / Tour' : ''}
          >
            {activePage === 'help' && !collapsed && <div className="active-marker"></div>}
            <HelpCircle size={18} strokeWidth={activePage === 'help' ? 2.5 : 2} />
            {!collapsed && <span className="sidebar-item-label">Help / Tour</span>}
          </button>
          
          {!collapsed && (
            <div className="sidebar-sparkle">
              <Sparkles size={16} color="#94a3b8" />
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="bottom-tab-bar">
        {NAV_GROUPS[0].items.concat(NAV_GROUPS[1].items.slice(0,2)).map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`tab-item ${activePage === item.id ? 'tab-item--active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={20} />
              <span className="tab-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default Sidebar;
