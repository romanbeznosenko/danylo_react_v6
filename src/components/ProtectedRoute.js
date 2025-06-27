export const ProtectedRoute = ({ children, requiredRoles = [], requireApproval = true }) => {
    const { user, loading, hasRole, isApproved } = useAuth();

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
        return (
            <div className="access-denied">
                <h2>Access Denied</h2>
                <p>You don't have permission to access this page.</p>
                <Link to="/dashboard">Go to Dashboard</Link>
            </div>
        );
    }

    if (requireApproval && !isApproved()) {
        return <Navigate to="/pending-approval" replace />;
    }

    return children;
};

export default DashboardPage;