import React, { useState, useRef, useEffect, useCallback } from 'react';
import { tracks } from '../data/tracks';
import Controls from './Controls';
import ProgressBar from './ProgressBar';
import TrackList from './TrackList';
import io from 'socket.io-client';
import RoomManager from './RoomManager';
import AudioVisualizer from './AudioVisualizer';

// Connect using dynamic hostname
const socket = io(`http://${window.location.hostname}:3001`);

/**
 * Main MusicPlayer component that manages audio state and logic.
 */
const MusicPlayer = ({ user }) => {
    // State variables for playback control
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [volume, setVolume] = useState(80);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState(null);
    const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);

    // Shared listening state
    const [roomCode, setRoomCode] = useState(null);
    const [role, setRole] = useState(null); // 'host' or 'listener'
    const [users, setUsers] = useState([]); // List of users in room
    const [isVisualizerActive, setIsVisualizerActive] = useState(true);

    // useRef to control the actual audio element
    const audioRef = useRef(null);
    // flag to prevent feedback loops when syncing
    const isInternalUpdate = useRef(false);

    const currentTrack = tracks[currentTrackIndex];

    // Helper to emit events only if host
    const emitAction = (action, data = {}) => {
        if (role === 'host') {
            socket.emit('playback-action', { roomCode, action, data });
        }
    };

    const togglePlayPause = () => {
        if (role === 'listener' && !isAutoplayBlocked) return; // Listeners can't control unless blocked

        const newIsPlaying = !isPlaying;
        setIsPlaying(newIsPlaying);

        if (newIsPlaying) {
            audioRef.current.play().catch(error => {
                console.error("Playback failed:", error);
                setIsAutoplayBlocked(true);
            });
        } else {
            audioRef.current.pause();
        }

        // Host notifies listeners
        emitAction('playPause', { isPlaying: newIsPlaying, currentTime: audioRef.current.currentTime });
    };

    const handleNext = () => {
        if (role === 'listener') return;
        const nextIndex = (currentTrackIndex + 1) % tracks.length;
        setCurrentTrackIndex(nextIndex);
        setIsPlaying(true); // Auto-play next
        emitAction('changeTrack', { trackIndex: nextIndex });
    };

    const handlePrev = () => {
        if (role === 'listener') return;
        const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
        setCurrentTrackIndex(prevIndex);
        setIsPlaying(true);
        emitAction('changeTrack', { trackIndex: prevIndex });
    };

    const toggleLoop = () => {
        if (role === 'listener') return;
        const newLoopState = !isLooping;
        setIsLooping(newLoopState);
        emitAction('toggleLoop', { isLooping: newLoopState });
    };

    const handleSeek = (time) => {
        if (role === 'listener') return;
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
            emitAction('seek', { currentTime: time });
        }
    };

    const handleTrackSelect = (index) => {
        if (role === 'listener') return;
        setCurrentTrackIndex(index);
        setIsPlaying(true);
        emitAction('changeTrack', { trackIndex: index });
    };

    // --- Audio Event Handlers ---

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const time = audioRef.current.currentTime;
            setCurrentTime(time);

            // Sync fallback: if host, periodically broadcast time to ensure sync
            // (Basic implementation: rely on events, but this updates UI)
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);

            // Check for pending seek from sync
            if (audioRef.current.dataset.pendingSeek) {
                const seekTime = parseFloat(audioRef.current.dataset.pendingSeek);
                if (!isNaN(seekTime)) {
                    audioRef.current.currentTime = seekTime;
                }
                delete audioRef.current.dataset.pendingSeek;
            }

            if (isPlaying) {
                audioRef.current.play().catch(e => setIsAutoplayBlocked(true));
            }
        }
    };

    const handleTrackEnd = () => {
        if (isLooping) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
        } else {
            handleNext();
        }
    };

    const handleAudioError = (e) => {
        console.error("Audio Error:", e);
        setError("Failed to load audio. Please check your connection.");
        setIsPlaying(false);
    };

    // --- Socket.IO Integration ---

    useEffect(() => {
        socket.on('room-created', ({ roomCode }) => {
            setRoomCode(roomCode);
            setRole('host');
        });

        socket.on('room-joined', ({ roomCode }) => {
            setRoomCode(roomCode);
            setRole('listener');
        });

        socket.on('room-users-update', (updatedUsers) => {
            setUsers(updatedUsers);
        });

        socket.on('request-sync', ({ requesterId }) => {
            if (role === 'host') {
                const currentState = {
                    trackIndex: currentTrackIndex,
                    currentTime: audioRef.current ? audioRef.current.currentTime : 0,
                    isPlaying,
                    isLooping
                };
                socket.emit('send-sync', { requesterId, state: currentState });
            }
        });

        socket.on('sync-state', (state) => {
            if (state) {
                // Bulk update state
                const trackChanged = state.trackIndex !== currentTrackIndex;
                setCurrentTrackIndex(state.trackIndex);
                setIsPlaying(state.isPlaying);
                setIsLooping(state.isLooping);

                if (audioRef.current) {
                    // If track changed, we must wait for metadata/canplay to seek
                    // Otherwise, the seeking might be overwritten by the new src loading
                    if (trackChanged) {
                        audioRef.current.dataset.pendingSeek = state.currentTime;
                    } else {
                        audioRef.current.currentTime = state.currentTime;
                    }

                    if (state.isPlaying) {
                        audioRef.current.play().catch(() => setIsAutoplayBlocked(true));
                    } else {
                        audioRef.current.pause();
                    }
                }
            }
        });


        socket.on('sync-action', ({ action, data }) => {
            if (isInternalUpdate.current) return;

            switch (action) {
                case 'playPause':
                    setIsPlaying(data.isPlaying);
                    if (audioRef.current) {
                        audioRef.current.currentTime = data.currentTime; // Sync time too
                        if (data.isPlaying) {
                            audioRef.current.play().catch(() => setIsAutoplayBlocked(true));
                        } else {
                            audioRef.current.pause();
                        }
                    }
                    break;
                case 'changeTrack':
                    setCurrentTrackIndex(data.trackIndex);
                    setIsPlaying(true); // Usually assume play on track change
                    // Effect hook will handle loading new src, but we need to ensure play happens
                    break;
                case 'seek':
                    if (audioRef.current) {
                        audioRef.current.currentTime = data.currentTime;
                        setCurrentTime(data.currentTime);
                    }
                    break;
                case 'toggleLoop':
                    setIsLooping(data.isLooping);
                    break;
                default:
                    console.warn("Unknown sync action:", action);
            }
        });

        socket.on('error', (msg) => {
            setError(msg);
        });

        return () => {
            socket.off('room-created');
            socket.off('room-joined');
            socket.off('room-users-update');
            socket.off('request-sync');
            socket.off('sync-state');
            socket.off('sync-action');
            socket.off('error');
        };
    }, [role, currentTrackIndex, isPlaying, isLooping]);

    // Volume effect
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume / 100;
        }
    }, [volume]);

    // Keyboard shortcuts - Disabled for listeners
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Only host can use keyboard shortcuts
            if (role !== 'host') return;

            // Simple check to avoid triggers when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlayPause();
                    break;
                case 'ArrowRight':
                    handleNext();
                    break;
                case 'ArrowLeft':
                    handlePrev();
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [role, isPlaying, currentTrackIndex, isLooping]); // Depend on state to ensure latest handlers are used

    // Room management handlers
    const createRoom = () => socket.emit('create-room', { username: user.username });
    const joinRoom = (code) => socket.emit('join-room', { roomCode: code, username: user.username });
    const toggleVisualizer = () => setIsVisualizerActive(!isVisualizerActive);

    const handleUnlockAutoplay = () => {
        if (audioRef.current) {
            audioRef.current.play().then(() => {
                setIsAutoplayBlocked(false);
                // Ensure we are synced
                emitAction('request-sync'); // Optional: re-request sync
            }).catch(e => console.error("Still blocked:", e));
        }
    };

    return (
        <div className={`app-layout ${isPlaying ? 'playing' : ''} ${isVisualizerActive ? 'visualizer-on' : ''}`}>
            {/* Real-time Audio Visualizer Background */}
            <AudioVisualizer
                audioRef={audioRef}
                isPlaying={isPlaying}
                volume={volume}
                isActive={isVisualizerActive}
            />

            <div className="music-player-container">
                {/* Left Side: Player Card */}
                <div className="player-card">
                    {/* Hidden Audio Element */}
                    <audio
                        ref={audioRef}
                        src={currentTrack.audioUrl}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onEnded={handleTrackEnd}
                        onError={handleAudioError}
                    />

                    {/* Autoplay Block Overlay */}
                    {isAutoplayBlocked && (
                        <div className="autoplay-overlay" onClick={handleUnlockAutoplay}>
                            <div className="overlay-content">
                                <span className="overlay-icon">🔇</span>
                                <h3>Tap to Unmute</h3>
                                <p>Browser blocked autoplay</p>
                            </div>
                        </div>
                    )}

                    {/* Main Artwork and Info */}
                    <div className="artwork-section">
                        <img
                            src={currentTrack.coverImage}
                            alt={currentTrack.title}
                            className={`cover-art ${isPlaying ? 'rotating' : ''}`}
                        />
                        <div className="track-metadata">
                            <h1 className="title">{currentTrack.title}</h1>
                            <div className="metadata-bottom">
                                <h2 className="artist">{currentTrack.artist}</h2>
                                <button
                                    className={`viz-toggle ${isVisualizerActive ? 'active' : ''}`}
                                    onClick={toggleVisualizer}
                                    title="Toggle Visualizer"
                                >
                                    {isVisualizerActive ? '✨' : '🌑'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && <div className="error-message">⚠️ {error}</div>}

                    {/* Progress Section */}
                    <ProgressBar
                        currentTime={currentTime}
                        duration={duration}
                        onSeek={handleSeek}
                        readOnly={role === 'listener'}
                    />

                    {/* Control Section */}
                    <div className="controls-section">
                        {role !== 'listener' ? (
                            <Controls
                                isPlaying={isPlaying}
                                isLooping={isLooping}
                                volume={volume}
                                onPlayPause={togglePlayPause}
                                onNext={handleNext}
                                onPrev={handlePrev}
                                onToggleLoop={toggleLoop}
                                onVolumeChange={setVolume}
                                isDisabled={!!error}
                            />
                        ) : (
                            <div className="listener-status">
                                <p>🎧 Listening with Host</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Sidebar (Room Manager + Playlist) */}
                <div className="sidebar">
                    <RoomManager
                        onCreateRoom={createRoom}
                        onJoinRoom={joinRoom}
                        roomCode={roomCode}
                        role={role}
                        users={users}
                    />

                    <TrackList
                        tracks={tracks}
                        currentIndex={currentTrackIndex}
                        onTrackSelect={handleTrackSelect}
                    />
                </div>
            </div>
        </div>
    );
};

export default MusicPlayer;
