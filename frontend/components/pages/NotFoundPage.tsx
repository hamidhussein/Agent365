
import React from 'react';
import ErrorDisplay from '../common/ErrorDisplay';

interface NotFoundPageProps {
    onGoHome: () => void;
}

const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoHome }) => {
    return (
        <div className="container mx-auto max-w-screen-2xl px-4 py-24">
            <ErrorDisplay
                title="404 - Not Found"
                message="The agent or page you're looking for doesn't exist or has been moved."
                actionText="Go to Homepage"
                onAction={onGoHome}
            />
        </div>
    );
};

export default NotFoundPage;
