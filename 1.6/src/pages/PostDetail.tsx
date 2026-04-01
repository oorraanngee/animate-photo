import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAppStore } from '../store';
import AnimationPlayer from '../components/AnimationPlayer';
import UserNickname from '../components/UserNickname';

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
  const [otherReason, setOtherReason] = useState('');

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
    const finalReason = reportReason === 'Other' ? otherReason : reportReason;
    await addDoc(collection(db, 'reports'), {
      postId: id,
      postTitle: post.title,
      reason: finalReason,
      reporterEmail: user.email,
      reporterId: user.uid,
      status: 'pending',
      createdAt: serverTimestamp()
    });
    setIsReportModalOpen(false);
    setReportReason('Spam');
    setOtherReason('');
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
              className="glossy-btn-red !py-1 !px-3 flex items-center gap-1 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 15 8-8 8 8"/></svg>
              {t('Report')}
            </button>
          )}
        </div>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-gray-600">
            {t('by')} <Link to={`/user/${post.authorId}`} className="hover:underline text-[#003399] font-bold"><UserNickname userId={post.authorId} fallbackName={getAuthorName(post.authorEmail, post.authorId)} /></Link>
            {post.createdAt && (
              <span className="ml-2 text-gray-500">
                &bull; {post.createdAt.toDate().toLocaleDateString()}
              </span>
            )}
          </div>
          {user?.uid === post.authorId && (
            <Link to={`/create?id=${post.id}`} className="glossy-btn">
              {t('Edit Animation')}
            </Link>
          )}
        </div>
        
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
              <div className="text-xs font-bold text-gray-600 mb-1">
                <Link to={`/user/${c.authorId}`} className="hover:underline text-[#003399]"><UserNickname userId={c.authorId} fallbackName={getAuthorName(c.authorEmail, c.authorId)} /></Link>
              </div>
              <p className="text-sm">{c.text}</p>
            </div>
          ))}
        </div>
      </div>

      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-gray-50 to-gray-200 border-2 border-[#003399] shadow-[0_10px_25px_rgba(0,0,0,0.5)] rounded-lg max-w-sm w-full overflow-hidden">
            <div className="bg-gradient-to-r from-[#003399] to-[#0066cc] text-white px-4 py-2 font-bold flex justify-between items-center">
              <span>{t('Report Animation')}</span>
              <button onClick={() => setIsReportModalOpen(false)} className="text-white hover:text-red-200 font-bold text-xl leading-none">&times;</button>
            </div>
            <div className="p-6">
              <label className="block mb-2 font-bold text-sm text-[#003366]">{t('Select Reason')}</label>
              <select 
                value={reportReason} 
                onChange={e => setReportReason(e.target.value)}
                className="xp-input w-full mb-2"
              >
                <option value="Spam">{t('Spam')}</option>
                <option value="Inappropriate Content">{t('Inappropriate Content')}</option>
                <option value="Copyright Violation">{t('Copyright Violation')}</option>
                <option value="Other">{t('Other')}</option>
              </select>
              {reportReason === 'Other' && (
                <textarea
                  className="xp-input w-full mb-4"
                  placeholder={t('Please specify the reason')}
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  rows={3}
                />
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setIsReportModalOpen(false)} className="glossy-btn-gray">
                  {t('Cancel')}
                </button>
                <button onClick={handleReport} className="glossy-btn-red">
                  {t('Submit Report')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
