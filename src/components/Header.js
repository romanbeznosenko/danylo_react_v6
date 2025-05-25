import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import './Header.css';

const Header = () => {
    return (
        <header className="header">
            <div className="container">
                <div className="header-content">
                    <Link to="/" className="logo">
                        Tire Management System
                    </Link>
                    <nav className="nav">
                        <ul>
                            <li>
                                <NavLink to="/"
                                    className={({ isActive }) => isActive ? 'active' : ''}
                                >
                                    Scrape Tires
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/database"
                                    className={({ isActive }) => isActive ? 'active' : ''}
                                >
                                    Database
                                </NavLink>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        </header>
    );
};

export default Header;