import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAppStore } from '../store';

export default function Contact() {
  const { t } = useTranslation();
  const { user, isBanned } = useAppStore();
  const [message, setMessage] = useState('');
  const [allowContact, setAllowContact] = useState(false);
  const [status, setStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isBanned || !message.trim()) return;

    setStatus('sending');
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        email: allowContact ? user.email : null,
        message,
        allowContact,
        createdAt: serverTimestamp(),
      });
      setStatus('success');
      setMessage('');
      setAllowContact(false);
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  if (!user) {
    return <div className="p-4 text-center">{t('Please login to contact support')}</div>;
  }

  if (isBanned) {
    return <div className="p-4 text-center text-red-600">{t('You are banned')}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-[#003366] mb-4 border-b-2 border-[#003366] pb-2">
        {t('Contact Support')}
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('Your message...')}
          className="w-full h-32 p-2 border border-gray-300 rounded resize-none focus:outline-none focus:border-[#003399]"
          required
        />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={allowContact}
            onChange={(e) => setAllowContact(e.target.checked)}
            className="rounded border-gray-300"
          />
          {t('Administration can contact you by email')}
        </label>
        <button
          type="submit"
          disabled={status === 'sending' || !message.trim()}
          className="glossy-btn self-start disabled:opacity-50"
        >
          {status === 'sending' ? t('Sending...') : t('Send')}
        </button>
        {status === 'success' && (
          <div className="text-green-600 text-sm">{t('Message sent successfully!')}</div>
        )}
        {status === 'error' && (
          <div className="text-red-600 text-sm">{t('Error sending message')}</div>
        )}
      </form>
    </div>
  );
}
