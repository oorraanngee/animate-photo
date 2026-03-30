import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';

const AVAILABLE_TAGS = [
  'animals', 'cats', 'kittens', 'dogs', 'puppies', 'meme', 'drawing', 'photo', 'nature', 'funny'
];

export default function Gallery() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'posts'), where('isApproved', '==', true), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag ? post.tags?.includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[#003366] mb-2 border-b-2 border-[#003366] pb-2">
        {t('Gallery')}
      </h1>

      <div className="glossy-panel flex flex-col gap-4">
        <input 
          type="text" 
          placeholder={t('Search by tags...')} 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          className="xp-input w-full"
        />

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
              selectedTag === null 
                ? 'bg-[#003399] text-white border-[#003399]' 
                : 'bg-white text-[#003399] border-[#003399] hover:bg-blue-50'
            }`}
          >
            {t('All Tags')}
          </button>
          {AVAILABLE_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                selectedTag === tag 
                  ? 'bg-[#003399] text-white border-[#003399]' 
                  : 'bg-white text-[#003399] border-[#003399] hover:bg-blue-50'
              }`}
            >
              {t(tag)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.map(post => (
          <Link to={`/gallery/${post.id}`} key={post.id} className="glossy-panel flex flex-col hover:scale-[1.02] transition-transform cursor-pointer block">
            <h2 className="font-bold text-lg truncate" title={post.title}>{post.title}</h2>
            <div className="text-xs text-gray-600 mb-2">by {post.authorEmail}</div>
            
            <div className="anim-container mx-auto w-full">
              <AnimationPlayer 
                frames={post.frames} 
                transition={post.transition} 
                frameDuration={post.frameDuration || 1000}
                transitionDuration={post.transitionDuration || 500}
              />
            </div>

            <p className="mt-2 text-sm line-clamp-2" title={post.description}>{post.description}</p>
            
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {post.tags.map((tag: string) => (
                  <span key={tag} className="bg-blue-100 text-[#003399] px-2 py-0.5 rounded text-[10px] font-bold">
                    #{t(tag)}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
        {filteredPosts.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-8">
            {t('No animations found matching your criteria.')}
          </div>
        )}
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
