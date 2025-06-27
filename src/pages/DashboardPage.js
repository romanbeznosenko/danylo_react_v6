// pages/DashboardPage.js
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import './DashboardPage.css';

const DashboardPage = () => {
    const { user, logout, canAccessDatabase, canScrape, isAdmin, isApproved } = useAuth();

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-content">
                <div className="dashboard-header">
                    <h1>Welcome, {user?.email}!</h1>
                    <button onClick={handleLogout} className="logout-button">
                        Logout
                    </button>
                </div>

                <div className="user-info-card">
                    <h2>Account Information</h2>
                    <div className="user-details">
                        <div className="detail-row">
                            <span className="label">Email:</span>
                            <span className="value">{user?.email}</span>
                        </div>
                        <div className="detail-row">
                            <span className="label">Role:</span>
                            <span className={`value role-${user?.role}`}>
                                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                            </span>
                        </div>
                        <div className="detail-row">
                            <span className="label">Status:</span>
                            <span className={`value status-${user?.status}`}>
                                {user?.status?.charAt(0).toUpperCase() + user?.status?.slice(1)}
                            </span>
                        </div>
                    </div>
                </div>

                {user?.status === 'pending' && (
                    <div className="status-message pending">
                        <h3>Account Pending Approval</h3>
                        <p>Your account is waiting for admin approval. You'll be able to access features once approved.</p>
                    </div>
                )}

                {user?.status === 'rejected' && (
                    <div className="status-message rejected">
                        <h3>Account Rejected</h3>
                        <p>Your account application was not approved. Please contact an administrator for more information.</p>
                    </div>
                )}

                <div className="dashboard-actions">
                    <h2>Available Actions</h2>
                    <div className="action-cards">
                        {canScrape() && (
                            <div className="action-card">
                                <h3>Scrape Tires</h3>
                                <p>Search and scrape tire data from external sources. Available to all approved users.</p>
                                <Link to="/" className="action-button">
                                    Start Scraping
                                </Link>
                            </div>
                        )}

                        {canAccessDatabase() && (
                            <div className="action-card">
                                <h3>Tire Database</h3>
                                <p>Search, manage, and add tire data to the database. Available to Users and Admins only.</p>
                                <Link to="/database" className="action-button">
                                    Access Database
                                </Link>
                            </div>
                        )}

                        {user?.role === 'guest' && isApproved() && (
                            <div className="action-card guest-info">
                                <h3>Guest Access</h3>
                                <p>As a guest, you can scrape tire data but cannot save it to the database. Upgrade to User role for full database access.</p>
                                <div className="guest-permissions">
                                    <div className="permission allowed">✅ Scrape tire data</div>
                                    <div className="permission denied">❌ Save to database</div>
                                    <div className="permission denied">❌ View database</div>
                                </div>
                            </div>
                        )}

                        {isAdmin() && (
                            <div className="action-card admin-card">
                                <h3>Admin Panel</h3>
                                <p>Manage users, approve registrations, and system administration.</p>
                                <Link to="/admin" className="action-button admin-button">
                                    Admin Panel
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;