import React from 'react';
import '@/styles/creator-studio.css';
import CreatorStudioApp from '../../creator-studio';

interface CreatorStudioPageProps {
  initialView?: string;
}

const CreatorStudioPage: React.FC<CreatorStudioPageProps> = ({ initialView }) => {
  return (
    <div className="min-h-screen">
      <CreatorStudioApp initialView={initialView} />
    </div>
  );
};

export default CreatorStudioPage;
