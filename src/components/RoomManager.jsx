import React, { useState } from 'react';

/**
 * RoomManager component for creating and joining shared listening sessions.
 * @param {Object} props
 * @param {Function} props.onCreateRoom - Callback to create room.
 * @param {Function} props.onJoinRoom - Callback to join room.
 * @param {string} props.roomCode - Active room code.
 * @param {string} props.role - User role (host/listener).
 */
const RoomManager = ({ onCreateRoom, onJoinRoom, roomCode, role, users }) => {
    const [joinCode, setJoinCode] = useState('');

    const handleJoin = () => {
        if (joinCode.trim()) {
            onJoinRoom(joinCode.trim());
        }
    };

    const copyRoomCode = () => {
        if (roomCode) {
            navigator.clipboard.writeText(roomCode);
            alert("Code copied to clipboard!");
        }
    };

    return (
        <div className="room-manager-container">
            {!roomCode ? (
                <>
                    <h3 className="sidebar-title">Host a Room</h3>
                    <div className="room-actions">
                        <button className="premium-btn glow-btn" onClick={onCreateRoom}>
                            ✨ Create Premium Room
                        </button>

                        <div className="social-divider">
                            <span>OR JOIN</span>
                        </div>

                        <div className="join-group">
                            <input
                                type="text"
                                className="join-input"
                                placeholder="Enter 6-digit code"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                maxLength={6}
                            />
                            <button
                                className="join-submit-btn"
                                onClick={handleJoin}
                                disabled={!joinCode}
                            >
                                Join
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <div className="social-dashboard">
                    <div className="room-status-card">
                        <div className="room-info status-box">
                            <span className="room-label">Access Code</span>
                            <div className="room-value-wrapper" onClick={copyRoomCode} title="Click to copy">
                                <span className="room-value">{roomCode}</span>
                                <span className="copy-icon">📋</span>
                            </div>
                        </div>
                        <div className="role-info status-box">
                            <span className="role-label">Your Status</span>
                            <span className={`badge ${role}`}>{role?.toUpperCase()}</span>
                        </div>
                    </div>

                    <div className="listeners-info status-box">
                        <span className="social-label">Live Listeners ({users?.length || 1})</span>
                        <div className="listeners-list">
                            {users && users.map((u, i) => (
                                <div
                                    key={u.id || i}
                                    className="listener-avatar"
                                    title={u.username}
                                    style={{ zIndex: users.length - i }}
                                >
                                    {u.username.charAt(0).toUpperCase()}
                                </div>
                            ))}
                            {users?.length > 5 && (
                                <div className="listener-avatar extra">+{users.length - 5}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoomManager;
