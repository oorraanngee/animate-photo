import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, deleteDoc, setDoc, where, addDoc } from 'firebase/firestore';
import { useAppStore } from '../store';

const getAuthorName = (email: string, id?: string) => {
  if (id) return `user${id.substring(0, 6)}`;
  if (email) return `user${email.length * 123}`;
  return 'anonymous';
};

export default function Home() {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const { user, isAdmin } = useAppStore();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportPostTitle, setReportPostTitle] = useState<string>('');
  const [reportReason, setReportReason] = useState('Spam');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;

    const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
    });

    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
    const unsubPosts = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((d: any) => d.isApproved !== false && d.isApproved !== 'false');
      setPosts(p.slice(0, 20));
    });

    return () => {
      unsubSettings();
      unsubPosts();
    };
  }, [t]);

  const handleDelete = async (id: string) => {
    if (!db) return;
    if (window.confirm(t('Are you sure?'))) {
      await deleteDoc(doc(db, 'posts', id));
    }
  };

  const handleEdit = async (post: any) => {
    if (!db) return;
    const newTitle = prompt(t('Title'), post.title);
    const newDesc = prompt(t('Description'), post.description);
    if (newTitle !== null && newDesc !== null) {
      await setDoc(doc(db, 'posts', post.id), { title: newTitle, description: newDesc }, { merge: true });
    }
  };

  const handleReport = async () => {
    if (!db || !user || !reportPostId) return;
    await addDoc(collection(db, 'reports'), {
      postId: reportPostId,
      postTitle: reportPostTitle,
      reason: reportReason,
      reporterEmail: user.email,
      reporterId: user.uid,
      status: 'pending',
      createdAt: new Date()
    });
    setIsReportModalOpen(false);
    alert(t('Report submitted successfully'));
  };

  const currentLang = i18n.language || 'en';
  const displayWelcomeText = currentLang === 'ru' 
    ? (settings.welcomeTextRu !== undefined && settings.welcomeTextRu !== '' ? settings.welcomeTextRu : (settings.welcomeText || t('Welcome')))
    : (settings.welcomeTextEn !== undefined && settings.welcomeTextEn !== '' ? settings.welcomeTextEn : (settings.welcomeText || t('Welcome')));

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#003366] mb-4 border-b-2 border-[#003366] pb-2">
        {displayWelcomeText}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.length === 0 && (
          <div className="text-gray-500 italic">{t('No animations yet')}</div>
        )}
        {posts.map(post => (
          <div key={post.id} className="glossy-panel flex flex-col relative">
            <div className="flex justify-between items-start mb-1">
              <Link to={`/gallery/${post.id}`} className="hover:underline truncate flex-1">
                <h2 className="font-bold text-lg truncate">{post.title}</h2>
              </Link>
              {user && !isAdmin && (
                <div className="relative ml-2">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      setOpenDropdownId(openDropdownId === post.id ? null : post.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded text-gray-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                  </button>
                  {openDropdownId === post.id && (
                    <div className="absolute right-0 mt-1 w-32 bg-white border rounded shadow-lg z-10">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          setReportPostId(post.id);
                          setReportPostTitle(post.title);
                          setIsReportModalOpen(true);
                          setOpenDropdownId(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 font-bold"
                      >
                        {t('Report')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-600 mb-2">{t('by')} {getAuthorName(post.authorEmail, post.authorId)}</div>
            
            <Link to={`/gallery/${post.id}`} className="hover:scale-[1.01] transition-transform cursor-pointer block">
              <div className="anim-container mx-auto w-full">
                <AnimationPlayer 
                  frames={post.frames} 
                  transition={post.transition} 
                  frameDuration={post.frameDuration || 1000}
                  transitionDuration={post.transitionDuration || 500}
                />
              </div>

              <p className="mt-2 text-sm line-clamp-2">{post.description}</p>
            </Link>
            
            <div className="flex justify-between items-center mt-2">
              {post.tags && post.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {post.tags.map((tag: string) => (
                    <span key={tag} className="bg-blue-100 text-[#003399] px-2 py-0.5 rounded text-[10px] font-bold">
                      #{t(tag)}
                    </span>
                  ))}
                </div>
              ) : <div />}
            </div>
            
            {isAdmin && (
              <div className="flex gap-2 mt-2">
                <button onClick={(e) => { e.preventDefault(); handleEdit(post); }} className="glossy-btn">
                  Edit
                </button>
                <button onClick={(e) => { e.preventDefault(); handleDelete(post.id); }} className="glossy-btn !text-red-600">
                  {t('Delete')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4 text-red-600">{t('Report Animation')}</h2>
            <label className="block mb-2 font-bold text-sm">{t('Select Reason')}</label>
            <select 
              value={reportReason} 
              onChange={e => setReportReason(e.target.value)}
              className="xp-input w-full mb-6"
            >
              <option value="Spam">{t('Spam')}</option>
              <option value="Inappropriate Content">{t('Inappropriate Content')}</option>
              <option value="Copyright Violation">{t('Copyright Violation')}</option>
              <option value="Other">{t('Other')}</option>
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsReportModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 font-bold">
                {t('Cancel')}
              </button>
              <button onClick={handleReport} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-bold">
                {t('Submit Report')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnimationPlayer({ frames, transition, frameDuration, transitionDuration }: { frames: string[], transition: string, frameDuration: number, transitionDuration: number }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!frames || frames.length < 2) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % frames.length);
    }, frameDuration);

    return () => clearInterval(interval);
  }, [frames, frameDuration]);

  if (!frames || frames.length === 0) return null;
  if (frames.length === 1) return <img src={frames[0]} className="anim-frame" alt="frame" />;

  const getTransitionStyle = (idx: number) => {
    const isActive = currentIndex === idx;
    
    if (transition === 'sharp') {
      return { opacity: isActive ? 1 : 0 };
    }
    
    if (transition === 'smooth') {
      return { 
        opacity: isActive ? 1 : 0,
        transition: `opacity ${transitionDuration}ms ease-in-out`
      };
    }
    
    if (transition === 'transform') {
      return {
        opacity: isActive ? 1 : 0,
        transform: isActive ? 'scale(1) rotate(0deg)' : 'scale(0.8) rotate(-5deg)',
        transition: `all ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`
      };
    }
    
    return {};
  };

  return (
    <>
      {frames.map((frame, idx) => (
        <img
          key={idx}
          src={frame}
          className="anim-frame"
          style={getTransitionStyle(idx)}
          alt={`frame ${idx}`}
        />
      ))}
    </>
  );
}
