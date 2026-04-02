import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';
import UserNickname from '../components/UserNickname';

export default function Notifications() {
  const { t } = useTranslation();
  const { user } = useAppStore();
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [recommendedPosts, setRecommendedPosts] = useState<any[]>([]);
  const [chatRequests, setChatRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user) return;

    const qSubs = query(collection(db, 'subscriptions'), where('subscriberId', '==', user.uid));
    const unsubSubs = onSnapshot(qSubs, (snapshot) => {
      const ids = snapshot.docs.map(d => d.data().targetId);
      setFollowingIds(ids);
    });

    const qChats = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );
    const unsubChats = onSnapshot(qChats, (snapshot) => {
      const requests = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((c: any) => !c.contacts || c.contacts[user.uid] !== true);
      setChatRequests(requests);
    });

    return () => {
      unsubSubs();
      unsubChats();
    };
  }, [user]);

  useEffect(() => {
    if (!db || !user) return;
    
    // Fetch latest 100 posts to rank them
    const qPosts = query(
      collection(db, 'posts'), 
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubPosts = onSnapshot(qPosts, (snapshot) => {
      const posts = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((d: any) => (d.isApproved !== false && d.isApproved !== 'false') || d.authorId === user?.uid || user?.email === 'dimabrovcuk4@gmail.com');
      
      // Rank posts
      const now = new Date().getTime();
      const rankedPosts = posts.map((post: any) => {
        let score = 0;
        if (followingIds.includes(post.authorId)) {
          score += 50; // High priority for subscriptions
        }
        score += (post.averageRating || 0) * 10;
        score += (post.commentsCount || 0) * 2;
        
        const postDate = post.createdAt?.toDate()?.getTime() || now;
        const daysOld = (now - postDate) / (1000 * 60 * 60 * 24);
        score -= daysOld * 2; // Time decay
        
        return { ...post, score, daysOld };
      });

      rankedPosts.sort((a, b) => b.score - a.score);
      
      setRecommendedPosts(rankedPosts.slice(0, 30)); // Show top 30
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

      {chatRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-[#003366] mb-4">{t('New Chat Requests')}</h2>
          <div className="flex flex-col gap-4">
            {chatRequests.map(chat => {
              const otherUserId = chat.participants.find((id: string) => id !== user.uid);
              return (
                <div key={chat.id} className="glossy-panel flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-[#003399]">
                      <UserNickname userId={otherUserId} fallbackName={otherUserId} />
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {chat.lastMessage || t('No messages yet')}
                    </div>
                  </div>
                  <Link to="/chat" className="glossy-btn text-sm">
                    {t('Open Chat')}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="text-xl font-bold text-[#003366] mb-4">{t('Recommended Animations')}</h2>

      {loading ? (
        <div className="text-center py-10">{t('Loading...')}</div>
      ) : recommendedPosts.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {t('No animations found.')}
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
                  {post.daysOld < 3 ? t('New animation by') : t('Animation by')} <Link to={`/user/${post.authorId}`} className="hover:underline font-bold text-[#003399]"><UserNickname userId={post.authorId} fallbackName={post.authorEmail} /></Link>
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
