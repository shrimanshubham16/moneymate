import React from 'react';
import './MaintenanceNotice.css';

export function MaintenanceNotice() {
  return (
    <div className="maintenance-overlay">
      <div className="maintenance-modal">
        <div className="maintenance-icon">🔧</div>
        <h1>Maintenance in Progress</h1>
        <p className="maintenance-message">
          We're upgrading FinFlow to provide you with better performance and reliability.
        </p>
        <div className="maintenance-details">
          <p><strong>What's happening:</strong></p>
          <ul>
            <li>Migrating to a new, faster database</li>
            <li>Improving data security and reliability</li>
            <li>Zero data loss - all your data is safe</li>
          </ul>
          <p className="maintenance-time">
            <strong>Estimated time:</strong> 15-30 minutes
          </p>
          <p className="maintenance-note">
            Please check back shortly. We'll be back online soon!
          </p>
        </div>
        <div className="maintenance-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    </div>
  );
}


