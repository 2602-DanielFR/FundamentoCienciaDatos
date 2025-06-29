import React from 'react';

interface CameraControlsProps {
    onStartCamera: () => void;
    onStopCamera: () => void;
    isModelLoaded: boolean;
    hasStream: boolean;
}

const CameraControls: React.FC<CameraControlsProps> = ({
    onStartCamera,
    onStopCamera,
    isModelLoaded,
    hasStream
}) => {
    return (
        <div className="control-group">
            <h3>Camera Controls</h3>
            <button
                onClick={onStartCamera}
                disabled={!isModelLoaded || hasStream}
            >
                Start Camera
            </button>
            <button
                onClick={onStopCamera}
                disabled={!hasStream}
            >
                Stop Camera
            </button>
        </div>
    );
};

export default CameraControls;