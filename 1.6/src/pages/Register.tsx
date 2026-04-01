import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, db, googleProvider } from '../firebase';
import { signInWithPopup, createUserWithEmailAndPassword, sendEmailVerification, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAppStore } from '../store';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const { t } = useTranslation();
  const { user, isRegistered, setUser } = useAppStore();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('register');

  useEffect(() => {
    if (user && isRegistered) {
      navigate('/');
    }
  }, [user, isRegistered, navigate]);

  const handleGoogleAuth = async () => {
    setError('');
    if (!auth) return setError(t('Setup Required'));
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      // Check if user exists
      if (db) {
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        if (userDoc.exists()) {
          // Already registered
          navigate('/');
        } else {
          // Needs to complete registration
          setNickname(`user${cred.user.uid.substring(0, 6)}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('Error'));
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!auth) return setError(t('Setup Required'));

    try {
      if (mode === 'register') {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCred.user);
        setSuccess(t('Registration successful. Please check your email to verify your account.'));
        await signOut(auth);
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        if (!userCred.user.emailVerified) {
          setError(t('Email not verified'));
          await signOut(auth);
        } else {
          // Check if user exists
          if (db) {
            const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));
            if (userDoc.exists()) {
              navigate('/');
            } else {
              setNickname(`user${userCred.user.uid.substring(0, 6)}`);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('Error'));
    }
  };

  const handleCompleteRegistration = async () => {
    setError('');
    if (!user || !db) return;
    if (!agreeTerms) {
      setError(t('You must agree to the terms of service'));
      return;
    }
    if (!nickname.trim()) {
      setError(t('Nickname is required'));
      return;
    }

    try {
      const isAdmin = user.email === 'dimabrovcuk4@gmail.com';
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        role: isAdmin ? 'admin' : 'user',
        nickname: nickname.trim(),
        createdAt: new Date().toISOString()
      });
      setUser(user, isAdmin, false, true);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('Error'));
    }
  };

  if (user && !isRegistered) {
    return (
      <div className="max-w-md mx-auto mt-10 glossy-panel p-6">
        <h2 className="text-2xl font-bold text-[#003366] mb-4 text-center">{t('Complete Registration')}</h2>
        
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        
        <div className="mb-4">
          <label className="block text-sm font-bold text-[#003366] mb-2">{t('Nickname')}</label>
          <input 
            type="text" 
            value={nickname} 
            onChange={e => setNickname(e.target.value)} 
            className="xp-input w-full"
          />
        </div>

        <div className="mb-6 flex items-start gap-2">
          <input 
            type="checkbox" 
            id="terms" 
            checked={agreeTerms} 
            onChange={e => setAgreeTerms(e.target.value === 'on' ? !agreeTerms : e.target.checked)} 
            className="mt-1"
          />
          <label htmlFor="terms" className="text-sm text-gray-700">
            {t('I agree to the terms of use')} <Link to="/terms" target="_blank" className="text-blue-600 hover:underline">{t('Terms of Service')}</Link>
          </label>
        </div>

        <button onClick={handleCompleteRegistration} className="glossy-btn w-full py-2 text-lg">
          {t('Complete Registration')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 glossy-panel p-6">
      <h2 className="text-2xl font-bold text-[#003366] mb-6 text-center">
        {mode === 'register' ? t('Register') : t('Login')}
      </h2>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}

      <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 mb-6">
        <div>
          <label className="block text-sm font-bold text-[#003366] mb-1">{t('Email')}</label>
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="xp-input w-full"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#003366] mb-1">{t('Password')}</label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="xp-input w-full"
            required
          />
        </div>
        <button type="submit" className="glossy-btn w-full py-2">
          {mode === 'register' ? t('Register') : t('Login')}
        </button>
      </form>

      <div className="relative flex py-2 items-center mb-6">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">{t('OR')}</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      <button onClick={handleGoogleAuth} className="glossy-btn w-full py-2 flex items-center justify-center gap-2 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        {t('Sign in with Google')}
      </button>

      <div className="text-center text-sm">
        {mode === 'register' ? (
          <>
            {t('Already have an account?')} <button onClick={() => setMode('login')} className="text-blue-600 hover:underline">{t('Login')}</button>
          </>
        ) : (
          <>
            {t('Don\'t have an account?')} <button onClick={() => setMode('register')} className="text-blue-600 hover:underline">{t('Register')}</button>
          </>
        )}
      </div>
    </div>
  );
}
