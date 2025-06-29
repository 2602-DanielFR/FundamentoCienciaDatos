import React, { useState } from 'react';
import { EmotionThresholds } from '../types';

const AlertThresholds: React.FC = () => {
    const [thresholds, setThresholds] = useState<EmotionThresholds>({
        happy: 0.7,
        sad: 0.6,
        angry: 0.5,
        surprised: 0.6
    });

    const handleThresholdChange = (emotion: keyof EmotionThresholds, value: number) => {
        setThresholds(prev => ({
            ...prev,
            [emotion]: value
        }));
    };

    return (
        <div className="control-group">
            <h3>Alert Thresholds</h3>
            <div className="threshold-inputs">
                {Object.entries(thresholds).map(([emotion, value]) => (
                    <div key={emotion} className="threshold-input">
                        <label>{emotion.charAt(0).toUpperCase() + emotion.slice(1)}</label>
                        <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={value}
                            onChange={(e) => handleThresholdChange(emotion as keyof EmotionThresholds, parseFloat(e.target.value))}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AlertThresholds;