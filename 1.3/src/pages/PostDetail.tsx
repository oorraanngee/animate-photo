import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAppStore } from '../store';

const getAuthorName = (email: string, id?: string) => {
  if (id) return `user${id.substring(0, 6)}`;
  if (email) return `user${email.length * 123}`;
  return 'anonymous';
};

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user, isAdmin } = useAppStore();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');

  useEffect(() => {
    if (!db || !id) return;

    const fetchPost = async () => {
      const docRef = doc(db, 'posts', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    };

    fetchPost();

    const qComments = query(collection(db, 'posts', id, 'comments'), orderBy('createdAt', 'desc'));
    const unsubComments = onSnapshot(qComments, (snapshot) => {
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubRatings = onSnapshot(collection(db, 'posts', id, 'ratings'), (snapshot) => {
      let total = 0;
      snapshot.docs.forEach(d => {
        total += d.data().value;
      });
      setAverageRating(snapshot.docs.length > 0 ? total / snapshot.docs.length : 0);
    });

    return () => {
      unsubComments();
      unsubRatings();
    };
  }, [id]);

  const handleAddComment = async () => {
    if (!db || !user || !id || !newComment.trim()) return;
    await addDoc(collection(db, 'posts', id, 'comments'), {
      text: newComment,
      authorEmail: user.email,
      authorId: user.uid,
      createdAt: serverTimestamp()
    });
    setNewComment('');
  };

  const handleRate = async (val: number) => {
    if (!db || !user || !id) {
      alert(t('Please login to rate'));
      return;
    }
    await setDoc(doc(db, 'posts', id, 'ratings', user.uid), {
      value: val,
      createdAt: serverTimestamp()
    });
    setRating(val);
  };

  const handleReport = async () => {
    if (!db || !user || !id) return;
    await addDoc(collection(db, 'reports'), {
      postId: id,
      postTitle: post.title,
      reason: reportReason,
      reporterEmail: user.email,
      reporterId: user.uid,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    setIsReportModalOpen(false);
    alert(t('Report submitted successfully'));
  };

  if (loading) return <div className="text-center py-10">{t('Loading...')}</div>;
  if (!post) return <div className="text-center py-10">{t('Post not found')}</div>;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/gallery" className="text-blue-600 hover:underline mb-4 inline-block">&larr; {t('Back to Gallery')}</Link>
      
      <div className="glossy-panel">
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-2xl font-bold">{post.title}</h1>
          {user && !isAdmin && (
            <button 
              onClick={() => setIsReportModalOpen(true)} 
              className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 font-bold text-sm flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 15 8-8 8 8"/></svg>
              {t('Report')}
            </button>
          )}
        </div>
        <div className="text-sm text-gray-600 mb-4">{t('by')} {getAuthorName(post.authorEmail, post.authorId)}</div>
        
        <div className="anim-container mx-auto w-full max-w-2xl mb-6">
          <AnimationPlayer 
            frames={post.frames} 
            transition={post.transition} 
            frameDuration={post.frameDuration || 1000}
            transitionDuration={post.transitionDuration || 500}
          />
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            <span className="font-bold">{t('Rating')}:</span>
            <span className="text-yellow-500 font-bold">{averageRating.toFixed(1)} / 5.0</span>
          </div>
          {user && (
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-600 mr-2">{t('Your rating')}:</span>
              {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(val => (
                <button 
                  key={val} 
                  onClick={() => handleRate(val)}
                  className={`text-xs px-1 ${rating === val ? 'bg-yellow-200 font-bold' : 'hover:bg-gray-100'}`}
                >
                  {val}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-50 p-4 rounded border mb-6">
          <h3 className="font-bold mb-2">{t('Description')}</h3>
          <p className="whitespace-pre-wrap">{post.description}</p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-wrap gap-2">
            {post.tags && post.tags.map((tag: string) => (
              <span key={tag} className="bg-blue-100 text-[#003399] px-2 py-1 rounded text-xs font-bold">
                #{t(tag)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="glossy-panel">
        <h2 className="text-xl font-bold mb-4">{t('Comments')}</h2>
        
        {user ? (
          <div className="flex flex-col gap-2 mb-6">
            <textarea 
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder={t('Write a comment...')}
              className="xp-input w-full min-h-[80px]"
            />
            <button onClick={handleAddComment} className="glossy-btn self-end">
              {t('Send')}
            </button>
          </div>
        ) : (
          <div className="bg-yellow-50 text-yellow-800 p-3 rounded mb-6 border border-yellow-200">
            {t('Please login to comment')}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {comments.length === 0 && <div className="text-gray-500 italic">{t('No comments yet')}</div>}
          {comments.map(c => (
            <div key={c.id} className="bg-white p-3 rounded border shadow-sm">
              <div className="text-xs font-bold text-gray-600 mb-1">{getAuthorName(c.authorEmail, c.authorId)}</div>
              <p className="text-sm">{c.text}</p>
            </div>
          ))}
        </div>
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
