import React from 'react';
import Sidebar from './Sidebar'; // Import the new Sidebar component
import './Layout.css'; // We'll create this CSS file next

const Layout = ({ children }) => {
  return (
    <div className="layout-container">
      <Sidebar />
      <main className="main-content">
        <div className="content-inner">
          {children} 
        </div>
      </main>
    </div>
  );
};

export default Layout; 