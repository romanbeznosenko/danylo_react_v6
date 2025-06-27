export const PendingApprovalPage = () => {
    const { user, logout } = useAuth();

    return (
        <div className="pending-container">
            <div className="pending-content">
                <div className="pending-icon">⏳</div>
                <h1>Account Pending Approval</h1>
                <p>Hi {user?.email},</p>
                <p>
                    Your account has been created successfully and is currently waiting for admin approval.
                    You'll receive access to the tire database once an administrator reviews and approves your account.
                </p>
                <div className="pending-actions">
                    <button onClick={logout} className="logout-button">
                        Logout
                    </button>
                    <Link to="/dashboard" className="dashboard-button">
                        View Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
};
