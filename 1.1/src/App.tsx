import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAppStore } from './store';
import Layout from './components/Layout';
import Home from './pages/Home';
import Create from './pages/Create';
import Gallery from './pages/Gallery';
import Admin from './pages/Admin';
import './i18n';

export default function App() {
  const { setUser } = useAppStore();

  useEffect(() => {
    if (!auth || !db) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.emailVerified) {
        let isAdmin = false;
        let isBanned = false;

        if (user.email === 'dimabrovcuk4@gmail.com') {
          isAdmin = true;
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            isBanned = userDoc.data().isBanned || false;
            if (userDoc.data().role === 'admin') isAdmin = true;
          } else {
            await setDoc(doc(db, 'users', user.uid), {
              email: user.email,
              role: isAdmin ? 'admin' : 'user',
              isBanned: false,
              createdAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }

        setUser(user, isAdmin, isBanned);
      } else {
        setUser(null, false, false);
      }
    });

    return () => unsubscribe();
  }, [setUser]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="create" element={<Create />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
