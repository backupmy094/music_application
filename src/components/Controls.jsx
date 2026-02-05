import { Play, Pause, SkipForward, SkipBack, Repeat, Volume2, VolumeX, Volume1 } from 'lucide-react';

/**
 * Controls component for playback and volume controls.
 */
const Controls = ({
    isPlaying,
    isLooping,
    volume,
    onPlayPause,
    onNext,
    onPrev,
    onToggleLoop,
    onVolumeChange,
    isDisabled = false
}) => {
    return (
        <div className={`controls-container ${isDisabled ? 'disabled-controls' : ''}`}>
            <div className="playback-btns">
                <button
                    className={`control-btn secondary ${isLooping ? "active-icon" : ""}`}
                    onClick={onToggleLoop}
                    title={isLooping ? "Loop Off" : "Loop On"}
                    disabled={isDisabled}
                >
                    <Repeat size={20} />
                </button>

                <button
                    className="control-btn"
                    onClick={onPrev}
                    title="Previous"
                    disabled={isDisabled}
                >
                    <SkipBack fill="currentColor" size={28} />
                </button>

                <button
                    className={`control-btn main-btn ${isDisabled ? 'btn-disabled' : ''}`}
                    onClick={onPlayPause}
                    title={isDisabled ? "Audio Error" : (isPlaying ? "Pause" : "Play")}
                    disabled={isDisabled}
                >
                    {isPlaying ? <Pause fill="white" size={32} /> : <Play fill="white" size={32} style={{ marginLeft: '4px' }} />}
                </button>

                <button
                    className="control-btn"
                    onClick={onNext}
                    title="Next"
                    disabled={isDisabled}
                >
                    <SkipForward fill="currentColor" size={28} />
                </button>
            </div>

            <div className="volume-container">
                <div className="volume-icon">
                    {volume === 0 ? <VolumeX size={18} /> : (volume < 50 ? <Volume1 size={18} /> : <Volume2 size={18} />)}
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => onVolumeChange(parseInt(e.target.value))}
                    className="volume-slider"
                    style={{ '--volume-percent': `${volume}%` }}
                    disabled={isDisabled}
                />
                <span className="volume-value">{volume}%</span>
            </div>
        </div>
    );
};

export default Controls;
