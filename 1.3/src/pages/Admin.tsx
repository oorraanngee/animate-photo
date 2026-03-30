import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAppStore } from '../store';
import { Navigate } from 'react-router-dom';

export default function Admin() {
  const { t } = useTranslation();
  const { isAdmin } = useAppStore();
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [welcomeTextEn, setWelcomeTextEn] = useState('');
  const [welcomeTextRu, setWelcomeTextRu] = useState('');
  const [marqueeText, setMarqueeText] = useState('');

  useEffect(() => {
    if (!db || !isAdmin) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPosts = onSnapshot(collection(db, 'posts'), (snapshot) => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubReports = onSnapshot(collection(db, 'reports'), (snapshot) => {
      setReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setWelcomeTextEn(data.welcomeTextEn !== undefined ? data.welcomeTextEn : (data.welcomeText || ''));
        setWelcomeTextRu(data.welcomeTextRu !== undefined ? data.welcomeTextRu : (data.welcomeText || ''));
        setMarqueeText(data.marqueeText || '');
      }
    });

    return () => {
      unsubUsers();
      unsubPosts();
      unsubReports();
      unsubSettings();
    };
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/" />;

  const handleSaveSettings = async () => {
    if (!db) return;
    await setDoc(doc(db, 'settings', 'main'), { 
      welcomeTextEn, 
      welcomeTextRu,
      marqueeText,
      welcomeText: null // Clear the old field
    }, { merge: true });
    alert(t('Settings updated'));
  };

  const handleBan = async (userId: string, isBanned: boolean) => {
    if (!db) return;
    await setDoc(doc(db, 'users', userId), { isBanned }, { merge: true });
  };

  const handleApprovePost = async (postId: string, isApproved: boolean) => {
    if (!db) return;
    await setDoc(doc(db, 'posts', postId), { isApproved }, { merge: true });
  };

  const handleDeletePost = async (postId: string) => {
    if (!db) return;
    if (window.confirm(t('Are you sure?'))) {
      await deleteDoc(doc(db, 'posts', postId));
    }
  };

  const handleDismissReport = async (reportId: string) => {
    if (!db) return;
    await setDoc(doc(db, 'reports', reportId), { status: 'resolved' }, { merge: true });
  };

  const handleBlockReportedPost = async (reportId: string, postId: string) => {
    if (!db) return;
    await setDoc(doc(db, 'posts', postId), { isApproved: false }, { merge: true });
    await setDoc(doc(db, 'reports', reportId), { status: 'blocked' }, { merge: true });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-red-700 mb-4 border-b-2 border-red-700 pb-2">
        {t('Admin Panel')}
      </h1>

      <div className="mb-8 border-2 border-[#ccc] p-4 bg-[#f4f5f5]">
        <h2 className="font-bold text-lg mb-2">{t('Settings')}</h2>
        <div className="flex flex-col gap-2 max-w-md">
          <label className="text-sm font-bold">{t('Main Page Text')} (EN)</label>
          <input 
            type="text" 
            value={welcomeTextEn} 
            onChange={e => setWelcomeTextEn(e.target.value)} 
            className="xp-input w-full"
          />

          <label className="text-sm font-bold mt-2">{t('Main Page Text')} (RU)</label>
          <input 
            type="text" 
            value={welcomeTextRu} 
            onChange={e => setWelcomeTextRu(e.target.value)} 
            className="xp-input w-full"
          />
          
          <label className="text-sm font-bold mt-2">{t('Marquee Text')}</label>
          <input 
            type="text" 
            value={marqueeText} 
            onChange={e => setMarqueeText(e.target.value)} 
            className="xp-input w-full"
          />

          <button onClick={handleSaveSettings} className="glossy-btn mt-2">
            {t('Save')}
          </button>
        </div>
      </div>

      <div className="border-2 border-[#ccc] p-4 bg-[#f4f5f5] mb-8">
        <h2 className="font-bold text-lg mb-2">{t('Animations Approval')}</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#d9e4f1] border border-[#7f9db9]">
              <th className="p-1 border border-[#7f9db9]">Title</th>
              <th className="p-1 border border-[#7f9db9]">Author</th>
              <th className="p-1 border border-[#7f9db9]">Status</th>
              <th className="p-1 border border-[#7f9db9]">Action</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(p => (
              <tr key={p.id} className="border border-[#7f9db9] bg-white">
                <td className="p-1 border border-[#7f9db9]">{p.title}</td>
                <td className="p-1 border border-[#7f9db9]">{p.authorEmail}</td>
                <td className="p-1 border border-[#7f9db9] text-center">
                  {p.isApproved ? <span className="text-green-600 font-bold">Approved</span> : <span className="text-orange-500 font-bold">Pending</span>}
                </td>
                <td className="p-1 border border-[#7f9db9] text-center flex gap-2 justify-center">
                  <button 
                    onClick={() => handleApprovePost(p.id, !p.isApproved)} 
                    className="glossy-btn"
                  >
                    {p.isApproved ? t('Reject') : t('Approve')}
                  </button>
                  <button 
                    onClick={() => handleDeletePost(p.id)} 
                    className="glossy-btn !text-red-600"
                  >
                    {t('Delete')}
                  </button>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={4} className="p-2 text-center text-gray-500 border border-[#7f9db9] bg-white">
                  {t('No animations found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-2 border-[#ccc] p-4 bg-[#f4f5f5] mb-8">
        <h2 className="font-bold text-lg mb-2">{t('Reports')}</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#d9e4f1] border border-[#7f9db9]">
              <th className="p-1 border border-[#7f9db9]">{t('Title')}</th>
              <th className="p-1 border border-[#7f9db9]">{t('Reason')}</th>
              <th className="p-1 border border-[#7f9db9]">{t('Reporter')}</th>
              <th className="p-1 border border-[#7f9db9]">Status</th>
              <th className="p-1 border border-[#7f9db9]">Action</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id} className="border border-[#7f9db9] bg-white">
                <td className="p-1 border border-[#7f9db9]">{r.postTitle}</td>
                <td className="p-1 border border-[#7f9db9]">{t(r.reason)}</td>
                <td className="p-1 border border-[#7f9db9]">{r.reporterEmail}</td>
                <td className="p-1 border border-[#7f9db9] text-center">
                  {r.status === 'pending' && <span className="text-orange-500 font-bold">{t('Pending')}</span>}
                  {r.status === 'resolved' && <span className="text-green-600 font-bold">{t('Resolved')}</span>}
                  {r.status === 'blocked' && <span className="text-red-600 font-bold">Blocked</span>}
                </td>
                <td className="p-1 border border-[#7f9db9] text-center flex gap-2 justify-center">
                  {r.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleDismissReport(r.id)} 
                        className="glossy-btn"
                      >
                        {t('Dismiss')}
                      </button>
                      <button 
                        onClick={() => handleBlockReportedPost(r.id, r.postId)} 
                        className="glossy-btn !text-red-600"
                      >
                        {t('Block Post')}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={5} className="p-2 text-center text-gray-500 border border-[#7f9db9] bg-white">
                  No reports found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-2 border-[#ccc] p-4 bg-[#f4f5f5]">
        <h2 className="font-bold text-lg mb-2">{t('Users')}</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#d9e4f1] border border-[#7f9db9]">
              <th className="p-1 border border-[#7f9db9]">Email</th>
              <th className="p-1 border border-[#7f9db9]">Status</th>
              <th className="p-1 border border-[#7f9db9]">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border border-[#7f9db9] bg-white">
                <td className="p-1 border border-[#7f9db9]">{u.email}</td>
                <td className="p-1 border border-[#7f9db9] text-center">
                  {u.isBanned ? <span className="text-red-600 font-bold">Banned</span> : 'Active'}
                </td>
                <td className="p-1 border border-[#7f9db9] text-center">
                  <button 
                    onClick={() => handleBan(u.id, !u.isBanned)} 
                    className="glossy-btn"
                  >
                    {u.isBanned ? t('Unban User') : t('Ban User')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
