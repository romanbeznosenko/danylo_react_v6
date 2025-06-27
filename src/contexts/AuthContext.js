// contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

    // Check if user is authenticated on app load
    useEffect(() => {
        const checkAuth = async () => {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                try {
                    const userData = await authAPI.getCurrentUser();
                    setUser(userData);
                    setToken(storedToken);
                } catch (error) {
                    console.error('Auth check failed:', error);
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const data = await authAPI.login(email, password);
            localStorage.setItem('token', data.access_token);
            setToken(data.access_token);
            setUser(data.user);
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Login error:', error);
            const errorMessage = error.response?.data?.detail || 'Login failed';
            return { success: false, error: errorMessage };
        }
    };

    const register = async (email, password, role = 'guest') => {
        try {
            const data = await authAPI.register(email, password, role);
            return { success: true, message: data.message };
        } catch (error) {
            console.error('Registration error:', error);
            const errorMessage = error.response?.data?.detail || 'Registration failed';
            return { success: false, error: errorMessage };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const hasRole = (requiredRoles) => {
        if (!user) return false;
        if (Array.isArray(requiredRoles)) {
            return requiredRoles.includes(user.role);
        }
        return user.role === requiredRoles;
    };

    const isApproved = () => {
        return user && user.status === 'approved';
    };

    const canAccessDatabase = () => {
        return isApproved() && hasRole(['user', 'admin']);
    };

    const canScrape = () => {
        return isApproved() && hasRole(['guest', 'user', 'admin']);
    };

    const isAdmin = () => {
        return hasRole('admin');
    };

    const value = {
        user,
        token,
        loading,
        login,
        register,
        logout,
        hasRole,
        isApproved,
        canAccessDatabase,
        canScrape,
        isAdmin,
        API_BASE_URL
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};