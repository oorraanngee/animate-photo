import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { collection, query, onSnapshot, where, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import AnimationPlayer from '../components/AnimationPlayer';
import { useAppStore } from '../store';

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAppStore();
  const [posts, setPosts] = useState<any[]>([]);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [nickname, setNickname] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !id) return;
    
    const unsubUser = onSnapshot(doc(db, 'users', id), (docSnap) => {
      if (docSnap.exists()) {
        setProfileUser(docSnap.data());
        setNickname(docSnap.data().nickname || '');
      }
    });

    const q = query(collection(db, 'posts'), where('authorId', '==', id));
    const unsubPosts = onSnapshot(q, (snapshot) => {
      const userPosts = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((d: any) => (d.isApproved !== false && d.isApproved !== 'false') || d.authorId === user?.uid || user?.email === 'dimabrovcuk4@gmail.com')
        .sort((a: any, b: any) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setPosts(userPosts);
    });

    return () => {
      unsubUser();
      unsubPosts();
    };
  }, [id]);

  useEffect(() => {
    if (!db || !user || !id || user.uid === id) return;

    const qSub = query(
      collection(db, 'subscriptions'), 
      where('subscriberId', '==', user.uid),
      where('targetId', '==', id)
    );

    const unsubSub = onSnapshot(qSub, (snapshot) => {
      if (!snapshot.empty) {
        setIsSubscribed(true);
        setSubscriptionId(snapshot.docs[0].id);
      } else {
        setIsSubscribed(false);
        setSubscriptionId(null);
      }
    });

    return () => unsubSub();
  }, [id, user]);

  const handleSaveNickname = async () => {
    if (!id || !user || user.uid !== id) return;
    try {
      await updateDoc(doc(db, 'users', id), { nickname });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleSubscription = async () => {
    if (!user || !id || user.uid === id) return;
    try {
      if (isSubscribed && subscriptionId) {
        await deleteDoc(doc(db, 'subscriptions', subscriptionId));
      } else {
        const newSubRef = doc(collection(db, 'subscriptions'));
        await setDoc(newSubRef, {
          subscriberId: user.uid,
          targetId: id,
          createdAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error toggling subscription:', error);
    }
  };

  const displayNickname = profileUser?.nickname || (profileUser?.email ? `user${profileUser.email.length * 123}` : `user${id?.substring(0, 6)}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 mb-2 border-b-2 border-[#003366] pb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#003366]">
            {t('Profile')}: {displayNickname}
          </h1>
          {user && user.uid !== id && (
            <button 
              onClick={handleToggleSubscription} 
              className={isSubscribed ? "glossy-btn-gray text-sm !py-1 !px-4" : "glossy-btn-blue text-sm !py-1 !px-4"}
            >
              {isSubscribed ? t('Unsubscribe') : t('Subscribe')}
            </button>
          )}
        </div>
        <div className="text-sm text-gray-500">
          ID: {id}
        </div>
        {user?.uid === id && (
          <div className="flex items-center gap-2 mt-2">
            {isEditing ? (
              <>
                <input 
                  type="text" 
                  value={nickname} 
                  onChange={(e) => setNickname(e.target.value)}
                  className="xp-input px-2 py-1 text-sm"
                  placeholder={t('Enter nickname')}
                  maxLength={30}
                />
                <button onClick={handleSaveNickname} className="glossy-btn-green text-sm !py-1 !px-3">{t('Save')}</button>
                <button onClick={() => setIsEditing(false)} className="glossy-btn-gray text-sm !py-1 !px-3">{t('Cancel')}</button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="glossy-btn text-sm !py-1 !px-3">{t('Edit Nickname')}</button>
            )}
          </div>
        )}
      </div>

      <h2 className="text-xl font-bold text-[#003366]">{t('Animations')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map(post => (
          <Link to={`/gallery/${post.id}`} key={post.id} className="glossy-panel flex flex-col hover:scale-[1.02] transition-transform cursor-pointer block">
            <h2 className="font-bold text-lg truncate" title={post.title}>{post.title}</h2>
            <div className="flex justify-between items-center mb-2">
              <div className="text-xs text-gray-600">
                {t('by')} {post.authorNickname || displayNickname}
                {post.createdAt && (
                  <span className="ml-2 text-gray-500">
                    &bull; {post.createdAt.toDate().toLocaleDateString()}
                  </span>
                )}
              </div>
              {user?.uid === id && (
                <Link to={`/create?id=${post.id}`} className="glossy-btn text-xs !py-1 !px-2">
                  {t('Edit Animation')}
                </Link>
              )}
            </div>
            
            <div className="anim-container mx-auto w-full">
              <AnimationPlayer 
                frames={post.frames} 
                transition={post.transition} 
                frameDuration={post.frameDuration || 1000}
                transitionDuration={post.transitionDuration || 500}
              />
            </div>

            <p className="mt-2 text-sm line-clamp-2" title={post.description}>{post.description}</p>
            
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
          </Link>
        ))}
        {posts.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-8">
            {t('No animations found')}
          </div>
        )}
      </div>
    </div>
  );
}
