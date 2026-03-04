import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState({
        id: 1,
        email: "admin@tire.com",
        role: "admin",
        status: "approved"
    });

    const login = async (email, password) => {
        const loggedUser = { id: 1, email, role: "admin", status: "approved" };
        setUser(loggedUser);
        localStorage.setItem('token', 'mock-token');
        return { success: true, user: loggedUser };
    };

    const register = async (email, password, role = 'guest') => {
        return { success: true, message: "Registered successfully" };
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const hasRole = (requiredRoles) => {
        if (!user) return false;
        if (Array.isArray(requiredRoles)) return requiredRoles.includes(user.role);
        return user.role === requiredRoles;
    };

    const isApproved = () => user && user.status === 'approved';
    const canAccessDatabase = () => true;
    const canScrape = () => true;
    const isAdmin = () => true;

    return (
        <AuthContext.Provider value={{
            user, loading: false, login, register, logout,
            hasRole, isApproved, canAccessDatabase, canScrape, isAdmin
        }}>
            {children}
        </AuthContext.Provider>
    );
};
