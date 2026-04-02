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
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.nickname) {
          setNickname(data.nickname);
          sessionStorage.setItem(`nickname_${userId}`, data.nickname);
        } else if (data.email) {
          const name = `user${data.email.length * 123}`;
          setNickname(name);
          sessionStorage.setItem(`nickname_${userId}`, name);
        } else {
          const name = `user${userId.substring(0, 6)}`;
          setNickname(name);
          sessionStorage.setItem(`nickname_${userId}`, name);
        }
      }
    }).catch(console.error);
  }, [userId]);

  return <span>{nickname}</span>;
}
