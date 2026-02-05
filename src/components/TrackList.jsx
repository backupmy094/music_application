import React, { useState, useMemo } from 'react';
import { Search, Music } from 'lucide-react';

/**
 * TrackList component for displaying and selecting tracks.
 */
const TrackList = ({ tracks, currentIndex, onTrackSelect }) => {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter tracks based on search query (Optimized with useMemo)
    const filteredTracks = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return tracks;

        return tracks.filter(track =>
            track.title.toLowerCase().includes(query) ||
            track.artist.toLowerCase().includes(query)
        );
    }, [tracks, searchQuery]);

    return (
        <div className="track-list">
            <div className="search-container">
                <Search className="search-icon" size={18} />
                <input
                    type="text"
                    placeholder="Search tracks or artists..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                    aria-label="Search tracks"
                />
            </div>

            <h3 className="sidebar-title">
                {searchQuery ? `Results (${filteredTracks.length})` : 'Playlist'}
            </h3>

            <div className="tracks-container">
                {filteredTracks.length > 0 ? (
                    filteredTracks.map((track) => {
                        const trackIndex = tracks.findIndex(t => t.id === track.id);
                        const isActive = trackIndex === currentIndex;

                        return (
                            <div
                                key={track.id}
                                className={`track-item ${isActive ? 'active' : ''}`}
                                onClick={() => onTrackSelect(trackIndex)}
                            >
                                <img src={track.coverImage} alt={track.title} className="track-thumb" />
                                <div className="track-info">
                                    <span className="track-name">{track.title}</span>
                                    <span className="track-artist">{track.artist}</span>
                                </div>
                                {isActive && (
                                    <div className="playing-bars">
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="no-results">No matches found for "{searchQuery}"</div>
                )}
            </div>
        </div>
    );
};

export default TrackList;
