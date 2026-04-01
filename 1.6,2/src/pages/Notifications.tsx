import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';
import UserNickname from '../components/UserNickname';

export default function Notifications() {
  const { t } = useTranslation();
  const { user } = useAppStore();
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [recommendedPosts, setRecommendedPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) return;

    const qSubs = query(collection(db, 'subscriptions'), where('subscriberId', '==', user.uid));
    const unsubSubs = onSnapshot(qSubs, (snapshot) => {
      const ids = snapshot.docs.map(d => d.data().targetId);
      setFollowingIds(ids);
    });

    return () => unsubSubs();
  }, [user]);

  useEffect(() => {
    if (!db || !user) return;
    
    if (followingIds.length === 0) {
      setRecommendedPosts([]);
      setLoading(false);
      return;
    }

    // Firestore 'in' query supports up to 30 items.
    // If a user follows more than 30, we'll just take the first 30 for this feed.
    const chunks = [];
    for (let i = 0; i < followingIds.length; i += 30) {
      chunks.push(followingIds.slice(i, i + 30));
    }

    const firstChunk = chunks[0]; // Just take the first 30 for simplicity in this demo

    const qPosts = query(
      collection(db, 'posts'), 
      where('authorId', 'in', firstChunk),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      const posts = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((d: any) => (d.isApproved !== false && d.isApproved !== 'false') || d.authorId === user?.uid || user?.email === 'dimabrovcuk4@gmail.com');
      setRecommendedPosts(posts);
      setLoading(false);
    });

    return () => unsubPosts();
  }, [followingIds, user]);

  if (!user) {
    return <div className="text-center py-10">{t('Please login to view notifications')}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#003366] mb-4 border-b-2 border-[#003366] pb-2">
        {t('Notifications & Recommendations')}
      </h1>

      {loading ? (
        <div className="text-center py-10">{t('Loading...')}</div>
      ) : followingIds.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {t('You are not subscribed to anyone yet. Subscribe to users to see their animations here!')}
        </div>
      ) : recommendedPosts.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {t('No recent animations from users you follow.')}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {recommendedPosts.map(post => (
            <div key={post.id} className="glossy-panel flex items-center gap-4">
              {post.frames && post.frames.length > 0 && (
                <Link to={`/gallery/${post.id}`} className="shrink-0">
                  <img src={post.frames[0]} alt="preview" className="w-24 h-24 object-cover rounded border border-[#ccc]" />
                </Link>
              )}
              <div className="flex-1">
                <Link to={`/gallery/${post.id}`} className="hover:underline">
                  <h2 className="font-bold text-lg text-[#003399]">{post.title}</h2>
                </Link>
                <div className="text-sm text-gray-600 mt-1">
                  {t('New animation by')} <Link to={`/user/${post.authorId}`} className="hover:underline font-bold text-[#003399]"><UserNickname userId={post.authorId} fallbackName={post.authorEmail} /></Link>
                </div>
                {post.createdAt && (
                  <div className="text-xs text-gray-500 mt-1">
                    {post.createdAt.toDate().toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
