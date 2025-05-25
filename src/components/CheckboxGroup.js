import React, { useState } from 'react';
import './CheckboxGroup.css';

const CheckboxGroup = ({
    items,
    selectedItems,
    onChange,
    maxHeight,
    searchable = false,
    valueField = 'id',
    labelField = 'name'
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleChange = (itemValue) => {
        const newSelected = selectedItems.includes(itemValue)
            ? selectedItems.filter(id => id !== itemValue)
            : [...selectedItems, itemValue];

        onChange(newSelected);
    };

    const filteredItems = searchable && searchTerm
        ? items.filter(item =>
            String(item[labelField]).toLowerCase().includes(searchTerm.toLowerCase()))
        : items;

    return (
        <div className="checkbox-group-container">
            {searchable && (
                <div className="search-box">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search..."
                        className="search-input"
                    />
                    {searchTerm && (
                        <button
                            className="clear-search"
                            onClick={() => setSearchTerm('')}
                        >
                            ×
                        </button>
                    )}
                </div>
            )}

            <div className="checkbox-group" style={{ maxHeight }}>
                {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                        <label key={item[valueField]} className="checkbox-item">
                            <input
                                type="checkbox"
                                checked={selectedItems.includes(item[valueField])}
                                onChange={() => handleChange(item[valueField])}
                            />
                            <span>{item[labelField]}</span>
                        </label>
                    ))
                ) : (
                    <div className="no-results">No results found</div>
                )}
            </div>

            {selectedItems.length > 0 && (
                <div className="selected-info">
                    {selectedItems.length} selected
                </div>
            )}
        </div>
    );
};

export default CheckboxGroup;