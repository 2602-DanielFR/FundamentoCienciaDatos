import React from 'react';
import { useFaceAPI } from '../hooks/useFaceAPI';
import CameraControls from './CameraControls';
import AlertThresholds from './AlertThresholds';
import SavedFaces from './SavedFaces';
import StatusBar from './StatusBar';
import './FaceRecognition.css';

const FaceRecognition: React.FC = () => {
    const {
        videoRef,
        canvasRef,
        isModelLoaded,
        savedFaces,
        status,
        startCamera,
        stopCamera,
        stream
    } = useFaceAPI();

    return (
        <div className="container">
            <h1>Face Recognition & Emotion Detection</h1>

            <StatusBar status={status} />

            <div className="controls">
                <CameraControls
                    onStartCamera={startCamera}
                    onStopCamera={stopCamera}
                    isModelLoaded={isModelLoaded}
                    hasStream={!!stream}
                />

                <AlertThresholds />
            </div>

            <div className="video-container">
                <video
                    ref={videoRef}
                    width="640"
                    height="480"
                    autoPlay
                    muted
                    id="video"
                />
                <canvas
                    ref={canvasRef}
                    width="640"
                    height="480"
                    id="overlay"
                />
            </div>

            <SavedFaces faces={savedFaces} />
        </div>
    );
};

export default FaceRecognition;