import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ 
          text: 'Registration successful! Check your email to confirm your account.', 
          type: 'success' 
        });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      setMessage({ text: error.message || 'An error occurred with Google Sign-in', type: 'error' });
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-soft)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <img src="/logo.png" alt="Kotomusubi Logo" style={{ height: '120px', marginBottom: '24px' }} />
        <h2 style={{ color: 'var(--text)', marginBottom: '8px', fontSize: '1.5rem' }}>
          {isSignUp ? 'Create an Account' : 'Welcome Back'}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.95rem' }}>
          {isSignUp ? 'Sign up to start learning Japanese' : 'Sign in to access your materials'}
        </p>

        {message.text && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: message.type === 'error' ? '#ffebee' : '#e8f5e9',
            color: message.type === 'error' ? '#c62828' : '#2e7d32',
            fontSize: '0.9rem',
            textAlign: 'left'
          }}>
            {message.text}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleAuth}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            backgroundColor: '#fff',
            color: '#3c4043',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #dadce0',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginBottom: '20px',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8f9fa'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = '#fff'}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--line)' }}></div>
          <span style={{ padding: '0 12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>OR</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--line)' }}></div>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--line)',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid var(--line)',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: 'var(--primary)',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '8px',
              transition: 'transform 0.1s'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <p style={{ marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage({ text: '', type: '' });
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '0',
              fontSize: '0.9rem'
            }}
          >
            {isSignUp ? 'Sign in here' : 'Sign up here'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
