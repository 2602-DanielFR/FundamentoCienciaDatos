import React from 'react';

interface StatusBarProps {
    status: {
        message: string;
        type: 'loading' | 'success' | 'error';
    };
}

const StatusBar: React.FC<StatusBarProps> = ({ status }) => {
    return (
        <div className={`status ${status.type}`}>
            {status.message}
        </div>
    );
};

export default StatusBar;