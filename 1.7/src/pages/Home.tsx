import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, deleteDoc, setDoc, where, addDoc } from 'firebase/firestore';
import { useAppStore } from '../store';
import AnimationPlayer from '../components/AnimationPlayer';
import UserNickname from '../components/UserNickname';

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
  const [otherReason, setOtherReason] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [feedType, setFeedType] = useState<'recent' | 'foryou'>('recent');
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  useEffect(() => {
    if (!db || !user) return;
    const qSubs = query(collection(db, 'subscriptions'), where('subscriberId', '==', user.uid));
    const unsubSubs = onSnapshot(qSubs, (snapshot) => {
      setFollowingIds(snapshot.docs.map(d => d.data().targetId));
    });
    return () => unsubSubs();
  }, [user]);

  useEffect(() => {
    if (!db) return;

    const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
    });

    let unsubPosts = () => {};

    if (feedType === 'recent') {
      const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
      unsubPosts = onSnapshot(q, (snapshot) => {
        const p = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((d: any) => (d.isApproved !== false && d.isApproved !== 'false') || d.authorId === user?.uid || isAdmin);
        setPosts(p.slice(0, 20));
      });
    } else if (feedType === 'foryou') {
      if (followingIds.length === 0) {
        setPosts([]);
      } else {
        const chunks = [];
        for (let i = 0; i < followingIds.length; i += 30) {
          chunks.push(followingIds.slice(i, i + 30));
        }
        const firstChunk = chunks[0];
        const q = query(collection(db, 'posts'), where('authorId', 'in', firstChunk), orderBy('createdAt', 'desc'), limit(20));
        unsubPosts = onSnapshot(q, (snapshot) => {
          const p = snapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((d: any) => (d.isApproved !== false && d.isApproved !== 'false') || d.authorId === user?.uid || isAdmin);
          setPosts(p);
        });
      }
    }

    return () => {
      unsubSettings();
      unsubPosts();
    };
  }, [feedType, followingIds]);

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
      await setDoc(doc(db, 'posts', post.id), { 
        title: newTitle, 
        description: newDesc,
        isApproved: isAdmin ? post.isApproved : false
      }, { merge: true });
    }
  };

  const handleReport = async () => {
    if (!db || !user || !reportPostId) return;
    const finalReason = reportReason === 'Other' ? otherReason : reportReason;
    await addDoc(collection(db, 'reports'), {
      postId: reportPostId,
      postTitle: reportPostTitle,
      reason: finalReason,
      reporterEmail: user.email,
      reporterId: user.uid,
      status: 'pending',
      createdAt: new Date()
    });
    setIsReportModalOpen(false);
    setReportReason('Spam');
    setOtherReason('');
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

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setFeedType('recent')}
          className={`px-4 py-2 font-bold rounded-t-lg border-b-4 transition-colors ${feedType === 'recent' ? 'border-[#003399] text-[#003399] bg-white/50' : 'border-transparent text-gray-500 hover:bg-white/30'}`}
        >
          {t('Recent')}
        </button>
        {user && (
          <button 
            onClick={() => setFeedType('foryou')}
            className={`px-4 py-2 font-bold rounded-t-lg border-b-4 transition-colors ${feedType === 'foryou' ? 'border-[#003399] text-[#003399] bg-white/50' : 'border-transparent text-gray-500 hover:bg-white/30'}`}
          >
            {t('For You')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.length === 0 && (
          <div className="text-gray-500 italic">
            {feedType === 'foryou' && followingIds.length === 0 
              ? t('You are not subscribed to anyone yet. Subscribe to users to see their animations here!') 
              : t('No animations yet')}
          </div>
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
                    <div className="absolute right-0 mt-1 w-32 glossy-dropdown z-10">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          setReportPostId(post.id);
                          setReportPostTitle(post.title);
                          setIsReportModalOpen(true);
                          setOpenDropdownId(null);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 glossy-dropdown-item"
                      >
                        {t('Report')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="text-xs text-gray-600 mb-2">
              {t('by')} <Link to={`/user/${post.authorId}`} className="hover:underline text-[#003399] font-bold"><UserNickname userId={post.authorId} fallbackName={getAuthorName(post.authorEmail, post.authorId)} /></Link>
              {post.createdAt && (
                <span className="ml-2 text-gray-500">
                  &bull; {post.createdAt.toDate().toLocaleDateString()}
                </span>
              )}
            </div>
            
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
