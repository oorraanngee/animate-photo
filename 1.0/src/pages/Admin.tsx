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
  const [welcomeText, setWelcomeText] = useState('');
  const [marqueeText, setMarqueeText] = useState('');

  useEffect(() => {
    if (!db || !isAdmin) return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'main'), (docSnap) => {
      if (docSnap.exists()) {
        setWelcomeText(docSnap.data().welcomeText || '');
        setMarqueeText(docSnap.data().marqueeText || '');
      }
    });

    return () => {
      unsubUsers();
      unsubSettings();
    };
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/" />;

  const handleSaveSettings = async () => {
    if (!db) return;
    await setDoc(doc(db, 'settings', 'main'), { welcomeText, marqueeText }, { merge: true });
    alert(t('Settings updated'));
  };

  const handleBan = async (userId: string, isBanned: boolean) => {
    if (!db) return;
    await setDoc(doc(db, 'users', userId), { isBanned }, { merge: true });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-red-700 mb-4 border-b-2 border-red-700 pb-2">
        {t('Admin Panel')}
      </h1>

      <div className="mb-8 border-2 border-[#ccc] p-4 bg-[#f4f5f5]">
        <h2 className="font-bold text-lg mb-2">{t('Settings')}</h2>
        <div className="flex flex-col gap-2 max-w-md">
          <label className="text-sm font-bold">{t('Main Page Text')}</label>
          <input 
            type="text" 
            value={welcomeText} 
            onChange={e => setWelcomeText(e.target.value)} 
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
