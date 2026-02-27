import React, { Component, ReactNode, ErrorInfo } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * ErrorBoundary - Catches React errors and displays fallback UI
 * 
 * Prevents white screen of death when components encounter errors
 * Especially useful for browser back/forward navigation issues
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/dashboard';
    };

    handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('finflow_selected_view');
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    handleClearCache = () => {
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('finflow_') || key.startsWith('cache_'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
        } catch (e) { /* ignore */ }
        this.setState({ hasError: false, error: null });
        window.location.href = '/dashboard';
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    padding: '2rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        background: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '3rem',
                        maxWidth: '500px',
                        boxShadow: 'var(--shadow-xl)'
                    }}>
                        <FaExclamationTriangle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Oops! Something went wrong</h2>
                        <p style={{
                            color: 'var(--text-secondary)',
                            marginBottom: '2rem',
                            lineHeight: '1.6'
                        }}>
                            Don't worry, your data is safe. This might happen after using the browser's back button.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                            <button
                                onClick={this.handleClearCache}
                                style={{
                                    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
                                    color: 'var(--bg-primary)',
                                    border: 'none',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: '1rem 2rem',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: 'var(--glow-cyan)'
                                }}
                            >
                                Clear Cache & Retry
                            </button>
                            <button
                                onClick={this.handleLogout}
                                style={{
                                    background: 'transparent',
                                    color: '#ef4444',
                                    border: '1px solid #ef4444',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: '0.75rem 2rem',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Logout & Re-login
                            </button>
                        </div>
                        {this.state.error && (
                            <details style={{
                                marginTop: '2rem',
                                textAlign: 'left',
                                fontSize: '0.875rem',
                                color: 'var(--text-tertiary)'
                            }}>
                                <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                                    Technical details
                                </summary>
                                <pre style={{
                                    background: 'rgba(0,0,0,0.2)',
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-md)',
                                    overflow: 'auto'
                                }}>
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
