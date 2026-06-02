import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // On mount, if a token exists, fetch the current user
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const me = await authAPI.getCurrentUser();
                    setUser(me);
                } catch (err) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                }
            }
            setLoading(false);
        };
        init();
    }, []);

    const login = async (email, password) => {
        try {
            const data = await authAPI.login(email, password);
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            setUser(data.user);
            return { success: true, user: data.user };
        } catch (err) {
            const message = err.response?.data?.detail || 'Login failed';
            return { success: false, message };
        }
    };

    const register = async (email, password) => {
        try {
            const data = await authAPI.register(email, password);
            return {
                success: true,
                message: data.status === 'approved'
                    ? 'Registered and approved! You can now log in.'
                    : 'Registered successfully. Awaiting admin approval.',
                status: data.status
            };
        } catch (err) {
            const message = err.response?.data?.detail || 'Registration failed';
            return { success: false, message };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const hasRole = (requiredRoles) => {
        if (!user) return false;
        if (Array.isArray(requiredRoles)) return requiredRoles.includes(user.role);
        return user.role === requiredRoles;
    };

    const isApproved = () => user && user.status === 'approved';
    const isAdmin = () => user && user.is_admin === true;
    // All approved users have full access (no role separation per requirements)
    const canAccessDatabase = () => isApproved();
    const canScrape = () => isApproved();

    return (
        <AuthContext.Provider value={{
            user, loading, login, register, logout,
            hasRole, isApproved, canAccessDatabase, canScrape, isAdmin
        }}>
            {children}
        </AuthContext.Provider>
    );
};
