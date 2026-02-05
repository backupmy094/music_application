import React, { useState } from 'react';
import axios from 'axios';

const Auth = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const [error, setError] = useState('');

    const { username, email, password } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setError('');

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const payload = isLogin ? { email, password } : { username, email, password };

        try {
            // Updated to use dynamic hostname for network access
            const res = await axios.post(`http://${window.location.hostname}:3001${endpoint}`, payload);
            onLogin(res.data.token, res.data.user);
        } catch (err) {
            setError(err.response?.data?.msg || 'Authentication failed');
        }
    };

    return (
        <div className="auth-container">
            <div className="app-logo main-logo">
                <span className="logo-icon">🎵</span>
                <span className="logo-text">VIBE<span className="accent">SYNC</span></span>
            </div>

            <h2 className="auth-subtitle">
                {isLogin ? 'Premium Shared Listening' : 'Create Your Vibe Account'}
            </h2>

            <form onSubmit={onSubmit} className="auth-form">
                {!isLogin && (
                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="Username"
                            name="username"
                            value={username}
                            onChange={onChange}
                            required
                            minLength="3"
                        />
                    </div>
                )}
                <div className="input-group">
                    <input
                        type="email"
                        placeholder="Email Address"
                        name="email"
                        value={email}
                        onChange={onChange}
                        required
                    />
                </div>
                <div className="input-group">
                    <input
                        type="password"
                        placeholder="Password"
                        name="password"
                        value={password}
                        onChange={onChange}
                        required
                        minLength="6"
                    />
                </div>

                {error && <div className="auth-error">{error}</div>}

                <button type="submit" className="primary-btn auth-btn glow-btn">
                    {isLogin ? 'Sign In' : 'Create Account'}
                </button>
            </form>

            <p className="auth-switch">
                {isLogin ? "New to VibeSync? " : "Already have an account? "}
                <span onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? 'Join Now' : 'Sign In'}
                </span>
            </p>
        </div>
    );
};

export default Auth;
