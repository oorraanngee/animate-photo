import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function UserNickname({ userId, fallbackName }: { userId: string, fallbackName: string }) {
  const [nickname, setNickname] = useState<string>(fallbackName);

  useEffect(() => {
    if (!db || !userId) return;
    
    // Simple cache to avoid too many reads
    const cached = sessionStorage.getItem(`nickname_${userId}`);
    if (cached) {
      setNickname(cached);
      return;
    }

    getDoc(doc(db, 'users', userId)).then(docSnap => {
      if (docSnap.exists() && docSnap.data().nickname) {
        const name = docSnap.data().nickname;
        setNickname(name);
        sessionStorage.setItem(`nickname_${userId}`, name);
      }
    }).catch(console.error);
  }, [userId]);

  return <span>{nickname}</span>;
}
