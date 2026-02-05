import React from 'react';

/**
 * ProgressBar component for displaying and controlling audio progress.
 * @param {Object} props
 * @param {number} props.currentTime - Current playback time in seconds.
 * @param {number} props.duration - Total duration of the track in seconds.
 * @param {Function} props.onSeek - Callback for when the user seeks.
 */
const ProgressBar = ({ currentTime, duration, onSeek, readOnly = false }) => {
    // Format seconds to mm:ss
    const formatTime = (time) => {
        if (isNaN(time)) return '00:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleProgressChange = (e) => {
        onSeek(parseFloat(e.target.value));
    };

    return (
        <div className="progress-container">
            <div className="time-info">
                <span className="time-display current">{formatTime(currentTime)}</span>
                <span className="time-display total">{formatTime(duration)}</span>
            </div>
            <div className="progress-track">
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    step="0.1"
                    value={currentTime}
                    onChange={handleProgressChange}
                    className={`progress-bar ${readOnly ? 'read-only' : ''}`}
                    disabled={readOnly}
                />
                <div
                    className="progress-fill"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                />
            </div>
        </div>
    );
};

export default ProgressBar;
