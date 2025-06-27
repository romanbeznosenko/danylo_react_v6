import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import './AdminPanel.css';

const AdminPanel = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [backupLoading, setBackupLoading] = useState(false);
    const [backupMessage, setBackupMessage] = useState('');

    // Pagination state
    const [pagination, setPagination] = useState({
        page: 1,
        perPage: 20,
        total: 0,
        totalPages: 0
    });

    // Filter state
    const [statusFilter, setStatusFilter] = useState('pending');

    useEffect(() => {
        loadUsers();
    }, [pagination.page, pagination.perPage, statusFilter]);

    const loadUsers = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await adminAPI.getUsers(
                pagination.page,
                pagination.perPage,
                statusFilter
            );

            setUsers(response.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.total || 0,
                totalPages: response.total_pages || 0
            }));
        } catch (err) {
            console.error('Error loading users:', err);
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleUserAction = async (userId, status) => {
        setActionLoading(prev => ({ ...prev, [userId]: true }));

        try {
            await adminAPI.approveUser(userId, status);
            // Reload users after action
            await loadUsers();
        } catch (err) {
            console.error('Error updating user:', err);
            setError(`Failed to ${status} user`);
        } finally {
            setActionLoading(prev => ({ ...prev, [userId]: false }));
        }
    };

    const handleCreateBackup = async () => {
        setBackupLoading(true);
        setBackupMessage('');

        try {
            const response = await adminAPI.createBackup();
            setBackupMessage(`Backup created successfully! Size: ${response.backup_size} bytes`);
        } catch (err) {
            console.error('Error creating backup:', err);
            setBackupMessage('Failed to create backup');
        } finally {
            setBackupLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const handlePerPageChange = (event) => {
        const newPerPage = parseInt(event.target.value);
        setPagination(prev => ({
            ...prev,
            perPage: newPerPage,
            page: 1
        }));
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString));
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'approved': return 'status-approved';
            case 'pending': return 'status-pending';
            case 'rejected': return 'status-rejected';
            default: return '';
        }
    };

    const getRoleBadgeClass = (role) => {
        switch (role) {
            case 'admin': return 'role-admin';
            case 'user': return 'role-user';
            case 'guest': return 'role-guest';
            default: return '';
        }
    };

    return (
        <div className="admin-panel">
            <div className="container">
                <div className="admin-header">
                    <h1>Admin Panel</h1>
                    <div className="admin-actions">
                        <button
                            onClick={handleCreateBackup}
                            disabled={backupLoading}
                            className="backup-btn"
                        >
                            {backupLoading ? 'Creating Backup...' : 'Create Database Backup'}
                        </button>
                    </div>
                </div>

                {backupMessage && (
                    <div className={`backup-message ${backupMessage.includes('Failed') ? 'error' : 'success'}`}>
                        {backupMessage}
                    </div>
                )}

                <div className="users-section">
                    <div className="section-header">
                        <h2>User Management</h2>
                        <div className="filters">
                            <label htmlFor="status-filter">Filter by status:</label>
                            <select
                                id="status-filter"
                                value={statusFilter || ''}
                                onChange={(e) => setStatusFilter(e.target.value || null)}
                            >
                                <option value="">All</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="error-message">
                            {error}
                            <button onClick={loadUsers} className="retry-btn">
                                Retry
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="loading-spinner">Loading users...</div>
                    ) : (
                        <>
                            {users.length > 0 ? (
                                <>
                                    <div className="users-count">
                                        Showing {users.length} of {pagination.total} users
                                    </div>

                                    <div className="users-table-container">
                                        <table className="users-table">
                                            <thead>
                                                <tr>
                                                    <th>Email</th>
                                                    <th>Role</th>
                                                    <th>Status</th>
                                                    <th>Created</th>
                                                    <th>Approved</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map(user => (
                                                    <tr key={user.user_id}>
                                                        <td className="user-email">{user.email}</td>
                                                        <td>
                                                            <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                                                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`status-badge ${getStatusBadgeClass(user.status)}`}>
                                                                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                                            </span>
                                                        </td>
                                                        <td>{formatDate(user.created_at)}</td>
                                                        <td>{formatDate(user.approved_at)}</td>
                                                        <td>
                                                            <div className="action-buttons">
                                                                {user.status === 'pending' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleUserAction(user.user_id, 'approved')}
                                                                            disabled={actionLoading[user.user_id]}
                                                                            className="approve-btn"
                                                                        >
                                                                            {actionLoading[user.user_id] ? 'Processing...' : 'Approve'}
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleUserAction(user.user_id, 'rejected')}
                                                                            disabled={actionLoading[user.user_id]}
                                                                            className="reject-btn"
                                                                        >
                                                                            {actionLoading[user.user_id] ? 'Processing...' : 'Reject'}
                                                                        </button>
                                                                    </>
                                                                )}

                                                                {user.status === 'approved' && (
                                                                    <button
                                                                        onClick={() => handleUserAction(user.user_id, 'rejected')}
                                                                        disabled={actionLoading[user.user_id]}
                                                                        className="reject-btn"
                                                                    >
                                                                        {actionLoading[user.user_id] ? 'Processing...' : 'Revoke'}
                                                                    </button>
                                                                )}

                                                                {user.status === 'rejected' && (
                                                                    <button
                                                                        onClick={() => handleUserAction(user.user_id, 'approved')}
                                                                        disabled={actionLoading[user.user_id]}
                                                                        className="approve-btn"
                                                                    >
                                                                        {actionLoading[user.user_id] ? 'Processing...' : 'Approve'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {pagination.totalPages > 1 && (
                                        <div className="pagination">
                                            <div className="pagination-info">
                                                <select
                                                    value={pagination.perPage}
                                                    onChange={handlePerPageChange}
                                                    className="per-page-select"
                                                >
                                                    <option value={10}>10 per page</option>
                                                    <option value={20}>20 per page</option>
                                                    <option value={50}>50 per page</option>
                                                </select>
                                            </div>

                                            <div className="pagination-controls">
                                                <button
                                                    onClick={() => handlePageChange(1)}
                                                    disabled={pagination.page === 1}
                                                    className="page-btn"
                                                >
                                                    First
                                                </button>

                                                <button
                                                    onClick={() => handlePageChange(pagination.page - 1)}
                                                    disabled={pagination.page === 1}
                                                    className="page-btn"
                                                >
                                                    Previous
                                                </button>

                                                <span className="page-info">
                                                    Page {pagination.page} of {pagination.totalPages}
                                                </span>

                                                <button
                                                    onClick={() => handlePageChange(pagination.page + 1)}
                                                    disabled={pagination.page === pagination.totalPages}
                                                    className="page-btn"
                                                >
                                                    Next
                                                </button>

                                                <button
                                                    onClick={() => handlePageChange(pagination.totalPages)}
                                                    disabled={pagination.page === pagination.totalPages}
                                                    className="page-btn"
                                                >
                                                    Last
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="no-users">
                                    No users found{statusFilter ? ` with status "${statusFilter}"` : ''}.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
