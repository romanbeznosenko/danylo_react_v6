import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

const Header = () => {
    const { user, logout, canAccessDatabase, isAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="header">
            <div className="container">
                <div className="header-content">
                    <Link to="/dashboard" className="logo">
                        Tire Management System
                    </Link>

                    {user && (
                        <nav className="nav">
                            <ul>
                                <li>
                                    <NavLink
                                        to="/dashboard"
                                        className={({ isActive }) => isActive ? 'active' : ''}
                                    >
                                        Dashboard
                                    </NavLink>
                                </li>

                                {canAccessDatabase() && (
                                    <>
                                        <li>
                                            <NavLink
                                                to="/"
                                                className={({ isActive }) => isActive ? 'active' : ''}
                                            >
                                                Scrape Tires
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink
                                                to="/database"
                                                className={({ isActive }) => isActive ? 'active' : ''}
                                            >
                                                Database
                                            </NavLink>
                                        </li>
                                    </>
                                )}

                                {isAdmin() && (
                                    <li>
                                        <NavLink
                                            to="/admin"
                                            className={({ isActive }) => isActive ? 'active' : ''}
                                        >
                                            Admin
                                        </NavLink>
                                    </li>
                                )}
                            </ul>
                        </nav>
                    )}

                    {user && (
                        <div className="user-info">
                            <div className="user-details">
                                <span className="user-email">{user.email}</span>
                                <span className={`user-role role-${user.role}`}>
                                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </span>
                                {user.status !== 'approved' && (
                                    <span className={`user-status status-${user.status}`}>
                                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                    </span>
                                )}
                            </div>
                            <button onClick={handleLogout} className="logout-btn">
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;