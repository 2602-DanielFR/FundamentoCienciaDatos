import React from 'react';
import { SavedFace } from '../types';

interface SavedFacesProps {
  faces: SavedFace[];
}

const SavedFaces: React.FC<SavedFacesProps> = ({ faces }) => {
  const isEmotionHigh = (emotion: string, value: number): boolean => {
    const thresholds: Record<string, number> = {
      happy: 0.7,
      sad: 0.6,
      angry: 0.5,
      surprised: 0.6
    };
    return thresholds[emotion] ? value >= thresholds[emotion] : false;
  };

  return (
    <div className="saved-faces">
      <h3>Saved Faces & Emotions</h3>
      <div className="faces-list">
        {faces.map((face, index) => (
          <div key={index} className="face-item">
            <div>
              <strong>{face.name}</strong>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Saved: {new Date(face.timestamp).toLocaleString()}
                {face.lastDetection && (
                  <>
                    <br />
                    Last detection: {new Date(face.lastDetection).toLocaleString()}
                  </>
                )}
              </div>
              {face.emotions && (
                <div className="emotion-display">
                  {Object.entries(face.emotions).map(([emotion, value]) => {
                    const percentage = ((value as number) * 100).toFixed(1);
                    const isHigh = isEmotionHigh(emotion, value as number);
                    return (
                      <div key={emotion} className={`emotion-item ${isHigh ? 'high' : ''}`}>
                        <div>{emotion}: {percentage}%</div>
                        <div className="emotion-bar">
                          <div
                            className="emotion-fill"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavedFaces;