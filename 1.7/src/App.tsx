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
import PostDetail from './pages/PostDetail';
import UserProfile from './pages/UserProfile';
import Contact from './pages/Contact';
import Notifications from './pages/Notifications';
import Register from './pages/Register';
import Terms from './pages/Terms';
import Chat from './pages/Chat';
import { Analytics } from "@vercel/analytics/react";
import './i18n';

export default function App() {
  const { setUser } = useAppStore();

  useEffect(() => {
    if (!auth || !db) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && (user.emailVerified || user.providerData.some(p => p.providerId === 'google.com'))) {
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
            setUser(user, isAdmin, isBanned, true);
          } else {
            setUser(user, isAdmin, isBanned, false);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(user, isAdmin, isBanned, false);
        }
      } else {
        setUser(null, false, false, false);
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
          <Route path="edit/:id" element={<Create />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="gallery/:id" element={<PostDetail />} />
          <Route path="user/:id" element={<UserProfile />} />
          <Route path="contact" element={<Contact />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="chat" element={<Chat />} />
          <Route path="register" element={<Register />} />
          <Route path="terms" element={<Terms />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
}
