import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import AnimationPlayer from '../components/AnimationPlayer';

const getAuthorName = (email: string, id?: string) => {
  if (id) return `user${id.substring(0, 6)}`;
  if (email) return `user${email.length * 123}`;
  return 'anonymous';
};

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    if (!db || !id) return;
    const q = query(collection(db, 'posts'), where('authorId', '==', id));
    const unsub = onSnapshot(q, (snapshot) => {
      const userPosts = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((d: any) => d.isApproved !== false && d.isApproved !== 'false')
        .sort((a: any, b: any) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setPosts(userPosts);
    });
    return () => unsub();
  }, [id]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-[#003366] mb-2 border-b-2 border-[#003366] pb-2">
        {t('Animations by')} {posts.length > 0 ? getAuthorName(posts[0].authorEmail, posts[0].authorId) : '...'}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map(post => (
          <Link to={`/gallery/${post.id}`} key={post.id} className="glossy-panel flex flex-col hover:scale-[1.02] transition-transform cursor-pointer block">
            <h2 className="font-bold text-lg truncate" title={post.title}>{post.title}</h2>
            <div className="text-xs text-gray-600 mb-2">{t('by')} {getAuthorName(post.authorEmail, post.authorId)}</div>
            
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
