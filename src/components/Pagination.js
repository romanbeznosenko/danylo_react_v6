import React from 'react';
import './Pagination.css';

const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
    perPage,
    onPerPageChange,
    totalItems,
    loading = false
}) => {
    const getVisiblePages = () => {
        const delta = 2; // Number of pages to show on each side of current page
        const range = [];
        const rangeWithDots = [];

        // Calculate start and end of the range
        let start = Math.max(1, currentPage - delta);
        let end = Math.min(totalPages, currentPage + delta);

        // Adjust range if we're near the beginning or end
        if (currentPage <= delta + 1) {
            end = Math.min(totalPages, delta * 2 + 2);
        }
        if (currentPage >= totalPages - delta) {
            start = Math.max(1, totalPages - delta * 2 - 1);
        }

        // Create array of page numbers
        for (let i = start; i <= end; i++) {
            range.push(i);
        }

        // Add first page and dots if necessary
        if (start > 1) {
            rangeWithDots.push(1);
            if (start > 2) {
                rangeWithDots.push('...');
            }
        }

        // Add main range
        rangeWithDots.push(...range);

        // Add last page and dots if necessary
        if (end < totalPages) {
            if (end < totalPages - 1) {
                rangeWithDots.push('...');
            }
            rangeWithDots.push(totalPages);
        }

        return rangeWithDots;
    };

    const handlePageClick = (page) => {
        if (page !== currentPage && page >= 1 && page <= totalPages && !loading) {
            onPageChange(page);
        }
    };

    const handlePerPageChange = (event) => {
        const newPerPage = parseInt(event.target.value);
        onPerPageChange(newPerPage);
    };

    const getItemRange = () => {
        const start = (currentPage - 1) * perPage + 1;
        const end = Math.min(currentPage * perPage, totalItems);
        return { start, end };
    };

    if (totalPages <= 1) {
        return null;
    }

    const { start, end } = getItemRange();
    const visiblePages = getVisiblePages();

    return (
        <div className="pagination-container">
            <div className="pagination-info">
                <span className="items-info">
                    Showing {start}-{end} of {totalItems} items
                </span>
                <div className="per-page-selector">
                    <label htmlFor="per-page">Items per page:</label>
                    <select
                        id="per-page"
                        value={perPage}
                        onChange={handlePerPageChange}
                        disabled={loading}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            <div className="pagination-controls">
                <button
                    className="pagination-btn"
                    onClick={() => handlePageClick(1)}
                    disabled={currentPage === 1 || loading}
                    title="First page"
                >
                    &#171; First
                </button>

                <button
                    className="pagination-btn"
                    onClick={() => handlePageClick(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    title="Previous page"
                >
                    &#8249; Prev
                </button>

                <div className="pagination-pages">
                    {visiblePages.map((page, index) => (
                        <React.Fragment key={index}>
                            {page === '...' ? (
                                <span className="pagination-dots">...</span>
                            ) : (
                                <button
                                    className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                                    onClick={() => handlePageClick(page)}
                                    disabled={loading}
                                >
                                    {page}
                                </button>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <button
                    className="pagination-btn"
                    onClick={() => handlePageClick(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    title="Next page"
                >
                    Next &#8250;
                </button>

                <button
                    className="pagination-btn"
                    onClick={() => handlePageClick(totalPages)}
                    disabled={currentPage === totalPages || loading}
                    title="Last page"
                >
                    Last &#187;
                </button>
            </div>

            <div className="pagination-summary">
                Page {currentPage} of {totalPages}
            </div>
        </div>
    );
};

export default Pagination;