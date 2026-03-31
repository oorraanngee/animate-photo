import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { collection, query, onSnapshot, where, doc, updateDoc } from 'firebase/firestore';
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
        .filter((d: any) => d.isApproved !== false && d.isApproved !== 'false')
        .sort((a: any, b: any) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setPosts(userPosts);
    });

    return () => {
      unsubUser();
      unsubPosts();
    };
  }, [id]);

  const handleSaveNickname = async () => {
    if (!id || !user || user.uid !== id) return;
    try {
      await updateDoc(doc(db, 'users', id), { nickname });
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    }
  };

  const displayNickname = profileUser?.nickname || (profileUser?.email ? `user${profileUser.email.length * 123}` : `user${id?.substring(0, 6)}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 mb-2 border-b-2 border-[#003366] pb-4">
        <h1 className="text-2xl font-bold text-[#003366]">
          {t('Profile')}: {displayNickname}
        </h1>
        {user?.uid === id && (
          <div className="flex items-center gap-2 mt-2">
            {isEditing ? (
              <>
                <input 
                  type="text" 
                  value={nickname} 
                  onChange={(e) => setNickname(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                  placeholder={t('Enter nickname')}
                  maxLength={30}
                />
                <button onClick={handleSaveNickname} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">{t('Save')}</button>
                <button onClick={() => setIsEditing(false)} className="bg-gray-400 text-white px-3 py-1 rounded text-sm hover:bg-gray-500">{t('Cancel')}</button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">{t('Edit Nickname')}</button>
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
              </div>
              {user?.uid === id && (
                <Link to={`/create?id=${post.id}`} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors">
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
