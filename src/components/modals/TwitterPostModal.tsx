/**
 * TwitterPostModal.tsx
 * 
 * Modal overlay for posting media to Twitter (X).
 * Shows media preview and allows users to compose tweet text before posting.
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, CheckCircle, AlertCircle, Send, ExternalLink, LogOut } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface TwitterPostModalProps {
    isOpen: boolean;
    onClose: () => void;
    mediaUrl: string | null;
    mediaType: 'image' | 'video';
}

interface TwitterUser {
    id: string;
    username: string;
    name: string;
}

type PostStatus = 'idle' | 'authenticating' | 'posting' | 'success' | 'error';

// Twitter (X) brand icon SVG
const XIcon = () => (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);

// ============================================================================
// SESSION STORAGE KEY
// ============================================================================

const TWITTER_SESSION_KEY = 'twitter_session_id';

// ============================================================================
// COMPONENT
// ============================================================================

export const TwitterPostModal: React.FC<TwitterPostModalProps> = ({
    isOpen,
    onClose,
    mediaUrl,
    mediaType
}) => {
    // --- State ---
    const [tweetText, setTweetText] = useState('');
    const [status, setStatus] = useState<PostStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [tweetUrl, setTweetUrl] = useState<string | null>(null);
    const [user, setUser] = useState<TwitterUser | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Character limit
    const MAX_CHARS = 280;
    const charsRemaining = MAX_CHARS - tweetText.length;
    const isOverLimit = charsRemaining < 0;

    // --- Effects ---

    // Check auth status and focus textarea when modal opens
    useEffect(() => {
        if (isOpen) {
            // Load session from localStorage
            const storedSession = localStorage.getItem(TWITTER_SESSION_KEY);
            if (storedSession) {
                setSessionId(storedSession);
                checkAuthStatus(storedSession);
            }
            setTimeout(() => textareaRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setTweetText('');
            setStatus('idle');
            setError(null);
            setTweetUrl(null);
        }
    }, [isOpen]);

    // Listen for OAuth popup messages
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'twitter-auth-success') {
                const { sessionId: newSessionId, user: newUser } = event.data;
                setSessionId(newSessionId);
                setUser(newUser);
                localStorage.setItem(TWITTER_SESSION_KEY, newSessionId);
                setStatus('idle');
                setError(null);
            } else if (event.data.type === 'twitter-auth-error') {
                setError(event.data.error || '授权失败');
                setStatus('error');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // --- Helpers ---

    const checkAuthStatus = async (session: string) => {
        try {
            const response = await fetch(`/api/twitter/status?sessionId=${session}`);
            const data = await response.json();

            if (data.authenticated && data.user) {
                setUser(data.user);
            } else {
                // Session expired
                localStorage.removeItem(TWITTER_SESSION_KEY);
                setSessionId(null);
                setUser(null);
            }
        } catch (err) {
            console.error('Failed to check auth status:', err);
        }
    };

    // --- Event Handlers ---

    const handleLogin = async () => {
        setStatus('authenticating');
        setError(null);

        try {
            const response = await fetch('/api/twitter/auth');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '无法开始授权');
            }

            // Open OAuth popup
            const popup = window.open(
                data.authUrl,
                'X 平台登录',
                'width=600,height=700,left=200,top=100'
            );

            // Check if popup was blocked
            if (!popup) {
                throw new Error('登录窗口被拦截，请允许本站打开弹窗。');
            }
        } catch (err: any) {
            console.error('Twitter auth error:', err);
            setError(err.message || '无法开始授权');
            setStatus('error');
        }
    };

    const handleLogout = async () => {
        if (sessionId) {
            try {
                await fetch('/api/twitter/logout', {
                    method: 'POST',
                    headers: { 'X-Twitter-Session': sessionId }
                });
            } catch (err) {
                console.error('Logout error:', err);
            }
        }

        localStorage.removeItem(TWITTER_SESSION_KEY);
        setSessionId(null);
        setUser(null);
    };

    const handlePost = async (skipMedia = false) => {
        if (!sessionId || isOverLimit) return;
        if (!skipMedia && !mediaUrl) return;
        if (!tweetText.trim()) {
            setError('请输入发布文案');
            return;
        }

        setStatus('posting');
        setError(null);

        try {
            const body: any = {
                text: tweetText.trim()
            };

            // Only include media if not skipping
            if (!skipMedia && mediaUrl) {
                body.mediaUrl = mediaUrl;
                body.mediaType = mediaType;
            }

            const response = await fetch('/api/twitter/post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Twitter-Session': sessionId
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '发布失败');
            }

            setTweetUrl(data.tweetUrl);
            setStatus('success');
        } catch (err: any) {
            console.error('Post error:', err);
            setError(err.message || '发布失败');
            setStatus('error');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    // --- Render ---

    if (!isOpen) return null;

    // Build the full media URL for display
    const fullMediaUrl = mediaUrl?.startsWith('http')
        ? mediaUrl
        : `${mediaUrl}`;

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && status !== 'posting' && onClose()}
            onKeyDown={handleKeyDown}
        >
            <div className="bg-[#121212] border border-neutral-800 rounded-2xl w-[550px] max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white">
                            <XIcon />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">发布到 X</h2>
                            {user && (
                                <p className="text-xs text-neutral-400">@{user.username}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={status === 'posting'}
                        className="p-2 hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <X size={20} className="text-neutral-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Not Authenticated State */}
                    {!user && status !== 'authenticating' && (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center text-white">
                                <XIcon />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-white">连接你的 X 账号</h3>
                                <p className="text-sm text-neutral-400 mt-1">
                                    登录后可直接从 AdCanvas 发布内容
                                </p>
                            </div>
                            <button
                                onClick={handleLogin}
                                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 transition-colors"
                            >
                                <XIcon />
                                使用 X 登录
                            </button>
                            {error && (
                                <p className="text-sm text-neutral-400 mt-2">{error}</p>
                            )}
                        </div>
                    )}

                    {/* Authenticating State */}
                    {status === 'authenticating' && (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <Loader2 size={40} className="text-white animate-spin" />
                            <p className="text-neutral-400">正在等待授权…</p>
                            <p className="text-xs text-neutral-500">请在弹出窗口中完成登录</p>
                        </div>
                    )}

                    {/* Authenticated - Compose Tweet */}
                    {user && status !== 'success' && (
                        <div className="space-y-4">
                            {/* Media Preview */}
                            <div className="rounded-xl overflow-hidden bg-black">
                                {mediaType === 'video' ? (
                                    <video
                                        src={fullMediaUrl}
                                        className="w-full max-h-[250px] object-contain"
                                        controls
                                        muted
                                    />
                                ) : (
                                    <img
                                        src={fullMediaUrl}
                                        alt="待发布素材"
                                        className="w-full max-h-[250px] object-contain"
                                    />
                                )}
                            </div>

                            {/* Tweet Text Input */}
                            <div className="space-y-2">
                                <textarea
                                    ref={textareaRef}
                                    value={tweetText}
                                    onChange={(e) => setTweetText(e.target.value)}
                                    placeholder="写下你想发布的内容…"
                                    disabled={status === 'posting'}
                                    className="w-full bg-[#1a1a1a] border border-neutral-700 rounded-xl p-4 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors resize-none disabled:opacity-50"
                                    rows={3}
                                />
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-neutral-500">
                                        发布文案
                                    </span>
                                    <span className={`${isOverLimit ? 'text-neutral-400' : charsRemaining <= 20 ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                        {charsRemaining}
                                    </span>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && status === 'error' && (
                                <div className="p-3 bg-neutral-500/10 border border-neutral-500/30 rounded-lg flex items-start gap-3">
                                    <AlertCircle size={20} className="text-neutral-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-neutral-400">{error}</p>
                                        <button
                                            onClick={() => {
                                                setStatus('idle');
                                                setError(null);
                                            }}
                                            className="text-xs text-neutral-400/70 hover:text-neutral-400 mt-1 underline"
                                        >
                                            重试
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Logout option */}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                            >
                                <LogOut size={12} />
                                退出 @{user.username}
                            </button>
                        </div>
                    )}

                    {/* Success State */}
                    {status === 'success' && tweetUrl && (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <div className="w-16 h-16 rounded-full bg-neutral-500/20 flex items-center justify-center">
                                <CheckCircle size={40} className="text-neutral-400" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-white">发布成功</h3>
                                <p className="text-sm text-neutral-400 mt-1">
                                    内容已发布到 X
                                </p>
                            </div>
                            <a
                                href={tweetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 transition-colors"
                            >
                                <ExternalLink size={18} />
                                在 X 中查看
                            </a>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-neutral-800 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={status === 'posting'}
                        className="px-4 py-2 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        {status === 'success' ? '关闭' : '取消'}
                    </button>

                    {user && status !== 'success' && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePost(true)}
                                disabled={status === 'posting' || isOverLimit || !tweetText.trim()}
                                className="flex items-center gap-2 px-4 py-2 bg-neutral-700 text-white font-medium rounded-full hover:bg-neutral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                title="仅发布文字，不附带图片"
                            >
                                仅文字
                            </button>
                            <button
                                onClick={() => handlePost(false)}
                                disabled={status === 'posting' || isOverLimit || !mediaUrl || !tweetText.trim()}
                                className="flex items-center gap-2 px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {status === 'posting' ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        正在发布…
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        发布
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
