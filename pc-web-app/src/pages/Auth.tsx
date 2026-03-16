import React, { useState } from 'react';
import { Plane } from 'lucide-react';
import api from '../api';

export default function Auth({ onLogin }: { onLogin: (name: string, token: string) => void }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                // FastAPI OAuth2PasswordRequestForm expects form data (username, password)
                const response = await api.post('/auth/login', {
                    email,
                    password
                });
                const { access_token, name: userName } = response.data;
                onLogin(userName, access_token);
            } else {
                await api.post('/auth/register', { email, password, name });
                // Automatically login after register
                const response = await api.post('/auth/login', {
                    email,
                    password
                });
                const { access_token, name: userName } = response.data;
                onLogin(userName, access_token);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="card auth-card text-center relative overflow-hidden">
                <div className="auth-header text-center mb-6">
                    <Plane size={48} className="mx-auto mb-4 text-[var(--accent)]" />
                    <h2 className="auth-title font-bold mb-2">DroneWatch AI</h2>
                    <p className="auth-subtitle text-muted">{isLogin ? 'Sign in to access your drone detection dashboard.' : 'Create an account to track drones.'}</p>
                </div>

                {error && (
                    <div className="bg-red-900/40 text-red-200 border border-red-500/20 rounded p-3 mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {!isLogin && (
                        <div>
                            <label className="input-label block mb-1 text-sm text-muted">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input-field"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="input-label block mb-1 text-sm text-muted">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="input-label block mb-1 text-sm text-muted">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary w-full mt-2"
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-muted">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="btn-link"
                    >
                        {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
}
