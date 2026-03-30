import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, deleteDoc, setDoc, where } from 'firebase/firestore';
import { useAppStore } from '../store';

export default function Home() {
  const { t, i18n } = useTranslation();
  const [posts, setPosts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const { isAdmin } = useAppStore();

  useEffect(() => {
    if (!db) return;

    const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
    });

    const q = query(collection(db, 'posts'), where('isApproved', '==', true), orderBy('createdAt', 'desc'), limit(20));
    const unsubPosts = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(p);
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
          <div key={post.id} className="glossy-panel flex flex-col">
            <Link to={`/gallery/${post.id}`} className="hover:scale-[1.01] transition-transform cursor-pointer block">
              <h2 className="font-bold text-lg mb-1 truncate">{post.title}</h2>
              <div className="text-xs text-gray-600 mb-2">by {post.authorEmail}</div>
              
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
            
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.tags.map((tag: string) => (
                  <span key={tag} className="bg-blue-100 text-[#003399] px-2 py-0.5 rounded text-[10px] font-bold">
                    #{t(tag)}
                  </span>
                ))}
              </div>
            )}
            
            {isAdmin && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => handleEdit(post)} className="glossy-btn">
                  Edit
                </button>
                <button onClick={() => handleDelete(post.id)} className="glossy-btn !text-red-600">
                  {t('Delete')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
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
