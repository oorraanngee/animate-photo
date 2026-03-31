import React, { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { auth, googleProvider, db } from '../firebase';
import { signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { collection, query, orderBy, limit, onSnapshot, doc, where } from 'firebase/firestore';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { user, isAdmin, isBanned } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [marqueeText, setMarqueeText] = useState('');

  useEffect(() => {
    if (db) {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20));
      const unsub = onSnapshot(q, (snapshot) => {
        const approvedPosts = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((d: any) => d.isApproved === true);
        setRecentPosts(approvedPosts.slice(0, 3));
      });

      const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (docSnap) => {
        if (docSnap.exists()) {
          setMarqueeText(docSnap.data().marqueeText || '');
        }
      });

      return () => {
        unsub();
        unsubSettings();
      };
    }
  }, []);

  const handleLogin = async () => {
    setAuthError('');
    setAuthSuccess('');
    if (!auth) return setAuthError(t('Setup Required'));
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
      setAuthError(t('Error'));
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'ru' : 'en');
  };

  const handleEmailLogin = async () => {
    setAuthError('');
    setAuthSuccess('');
    if (!auth) return setAuthError(t('Setup Required'));
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      if (!userCred.user.emailVerified) {
        setAuthError(t('Email not verified'));
        await signOut(auth);
      }
    } catch (error) {
      console.error(error);
      setAuthError(t('Invalid credentials'));
    }
  };

  const handleEmailRegister = async () => {
    setAuthError('');
    setAuthSuccess('');
    if (!auth) return setAuthError(t('Setup Required'));
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCred.user);
      setAuthSuccess(t('Registration successful'));
      await signOut(auth);
    } catch (error) {
      console.error(error);
      setAuthError(t('Error'));
    }
  };

  return (
    <div className="min-h-screen p-4 flex justify-center bg-gradient-to-b from-[#ffffff] to-[#ededed]">
      <div className="w-full max-w-6xl">
        {!db && (
          <div className="bg-red-600 text-white p-2 text-center font-bold mb-4 border-2 border-red-800 rounded-lg">
            {t('Setup Instructions')}
          </div>
        )}
        
        <div className="glossy-header flex justify-between items-center px-6 mb-0 rounded-b-none">
          <div className="text-2xl font-bold tracking-wider text-white drop-shadow-md">
            Animate Photo
          </div>
          <div className="flex items-center gap-4 text-sm font-bold">
            <Link to="/" className="text-white hover:text-blue-200 drop-shadow">{t('Home')}</Link>
            <Link to="/create" className="text-white hover:text-blue-200 drop-shadow">{t('Create Animation')}</Link>
            <Link to="/gallery" className="text-white hover:text-blue-200 drop-shadow">{t('Gallery')}</Link>
            {isAdmin && (
              <Link to="/admin" className="text-red-300 hover:text-red-100 drop-shadow">{t('Admin Panel')}</Link>
            )}
            <div className="w-px h-6 bg-white/30 mx-2"></div>
            {user ? (
              <div className="flex items-center gap-4">
                <span className="text-white drop-shadow truncate max-w-[150px]" title={user.email || ''}>{user.email}</span>
                <button onClick={handleLogout} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded border border-white/40 transition-colors shadow-sm">
                  {t('Logout')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 relative">
                <input 
                  type="email" 
                  placeholder={t('Email')} 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="px-2 py-1 rounded text-black text-xs w-32 border border-blue-800"
                />
                <input 
                  type="password" 
                  placeholder={t('Password')} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="px-2 py-1 rounded text-black text-xs w-32 border border-blue-800"
                />
                <button onClick={handleEmailLogin} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded border border-white/40 transition-colors shadow-sm">{t('Login')}</button>
                <button onClick={handleEmailRegister} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded border border-white/40 transition-colors shadow-sm">{t('Register')}</button>
                
                {(authError || authSuccess) && (
                  <div className={`absolute top-10 right-0 p-2 text-xs rounded border shadow-lg z-50 whitespace-nowrap ${authError ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700'}`}>
                    {authError || authSuccess}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {marqueeText && (
          <div className="glossy-marquee py-2 mb-6 rounded-b-xl overflow-hidden whitespace-nowrap w-full">
            <div className="inline-block animate-[marquee_25s_linear_infinite] font-bold text-lg pl-[100%]">
              {marqueeText}
            </div>
          </div>
        )}

        <div className="flex flex-row-reverse gap-4 mt-2">
          {/* Sidebar */}
          <div className="w-64 shrink-0 flex flex-col gap-4 glossy-panel p-4">
            <div className="bg-white/50 rounded p-3 border border-white/60 shadow-sm">
              <div className="font-bold text-[#003399] mb-2 border-b border-[#003399]/20 pb-1">{t('Language')}</div>
              <button onClick={toggleLanguage} className="glossy-btn w-full">
                {i18n.language === 'en' ? 'Русский' : 'English'}
              </button>
            </div>

            <div className="bg-white/50 rounded p-3 border border-white/60 shadow-sm">
              <div className="font-bold text-[#003399] mb-2 border-b border-[#003399]/20 pb-1">{t('Menu')}</div>
              <div className="flex flex-col gap-2">
                <Link to="/" className="glossy-btn">{t('Home')}</Link>
                <Link to="/create" className="glossy-btn">{t('Create Animation')}</Link>
                <Link to="/gallery" className="glossy-btn">{t('Gallery')}</Link>
                {user && (
                  <>
                    <Link to={`/user/${user.uid}`} className="glossy-btn">{t('My Page')}</Link>
                    <Link to="/contact" className="glossy-btn">{t('Contact Support')}</Link>
                  </>
                )}
                {isAdmin && (
                  <Link to="/admin" className="glossy-btn text-red-700">{t('Admin Panel')}</Link>
                )}
              </div>
            </div>

            {!user && (
              <div className="bg-white/50 rounded p-3 border border-white/60 shadow-sm">
                <div className="font-bold text-[#003399] mb-2 border-b border-[#003399]/20 pb-1">{t('Account')}</div>
                <div className="flex flex-col gap-2">
                  <button onClick={handleLogin} className="glossy-btn">{t('Sign in with Google')}</button>
                </div>
              </div>
            )}
            
            <div className="bg-white/50 rounded p-3 border border-white/60 shadow-sm">
              <div className="font-bold text-[#003399] mb-2 border-b border-[#003399]/20 pb-1">{t('Try the editor!')}</div>
              <Link to="/create" className="block overflow-hidden rounded border border-[#ccc] hover:border-[#003399] transition-colors">
                <video 
                  src="/promo.mp4" 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-auto object-cover"
                />
              </Link>
            </div>

            <div className="bg-white/50 rounded p-3 border border-white/60 shadow-sm">
              <div className="font-bold text-[#003399] mb-2 border-b border-[#003399]/20 pb-1">{t('Recent Animations')}</div>
              <div className="flex flex-col gap-2">
                {recentPosts.length === 0 && <div className="text-xs text-gray-500">{t('No animations yet')}</div>}
                {recentPosts.map(post => (
                  <Link to={`/gallery/${post.id}`} key={post.id} className="border border-[#ccc] p-1 bg-white rounded hover:bg-gray-50 transition-colors block cursor-pointer">
                    <div className="text-xs font-bold truncate">{post.title}</div>
                    {post.frames && post.frames.length > 0 && (
                      <img src={post.frames[0]} alt="preview" className="w-full h-24 object-cover mt-1 rounded" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-h-[500px] p-2 sm:p-4">
            <Outlet />
          </div>
        </div>
        
        <footer className="glossy-footer mt-12 p-6 text-sm text-gray-700 text-center">
          <div className="mb-4">
            <a href="https://github.com/oorraanngee/animate-photo" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline mx-2 font-bold">GitHub</a>
            |
            <a href="mailto:am2004idd@gmail.com" className="text-blue-600 hover:underline mx-2 font-bold">am2004idd@gmail.com</a>
          </div>
          <p className="max-w-3xl mx-auto leading-relaxed whitespace-pre-wrap">
            {t('footer_disclaimer')}
          </p>
        </footer>
      </div>
    </div>
  );
}
