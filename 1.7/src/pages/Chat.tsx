import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, setDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';
import UserNickname from '../components/UserNickname';

export default function Chat() {
  const { t } = useTranslation();
  const { user } = useAppStore();
  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newChatUserId, setNewChatUserId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!db || !user) return;

    // Fetch user's chats
    const qChats = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubChats = onSnapshot(qChats, (snapshot) => {
      setChats(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubChats();
  }, [user]);

  useEffect(() => {
    if (!db || !activeChatId) return;

    const qMessages = query(
      collection(db, 'chats', activeChatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubMessages();
  }, [activeChatId]);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !newChatUserId.trim() || newChatUserId === user.uid) return;

    // Check if chat already exists
    const existingChat = chats.find(c => c.participants.includes(newChatUserId));
    if (existingChat) {
      setActiveChatId(existingChat.id);
      setNewChatUserId('');
      return;
    }

    // Create new chat
    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: [user.uid, newChatUserId],
        updatedAt: serverTimestamp(),
        contacts: {
          [user.uid]: true, // Added to contacts by initiator
          [newChatUserId]: false // Not in contacts for recipient yet (Unknown)
        }
      });
      setActiveChatId(chatRef.id);
      setNewChatUserId('');
    } catch (error) {
      console.error('Error creating chat:', error);
      alert(t('Error creating chat. Make sure the user ID is correct.'));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !activeChatId || !newMessage.trim()) return;

    try {
      await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
        text: newMessage,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'chats', activeChatId), {
        updatedAt: serverTimestamp(),
        lastMessage: newMessage
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleAddToContacts = async (chatId: string) => {
    if (!db || !user) return;
    try {
      await setDoc(doc(db, 'chats', chatId), {
        contacts: {
          [user.uid]: true
        }
      }, { merge: true });
    } catch (error) {
      console.error('Error adding to contacts:', error);
    }
  };

  if (!user) {
    return <div className="text-center py-10">{t('Please login to use chat')}</div>;
  }

  const filteredChats = chats.filter(chat => {
    const otherUserId = chat.participants.find((id: string) => id !== user.uid);
    // Basic search by ID for now, as we don't have nicknames loaded synchronously
    return otherUserId?.toLowerCase().includes(searchQuery.toLowerCase()) || 
           chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const knownChats = filteredChats.filter(c => c.contacts && c.contacts[user.uid] === true);
  const unknownChats = filteredChats.filter(c => !c.contacts || c.contacts[user.uid] !== true);

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeOtherUserId = activeChat?.participants.find((id: string) => id !== user.uid);

  return (
    <div className="flex h-[calc(100vh-150px)] border-2 border-[#ccc] bg-white">
      {/* Sidebar */}
      <div className="w-1/3 border-r-2 border-[#ccc] flex flex-col bg-[#f4f5f5]">
        <div className="p-4 border-b border-[#ccc]">
          <h2 className="font-bold text-[#003366] text-lg mb-2">{t('Chats')}</h2>
          <form onSubmit={handleStartChat} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newChatUserId}
              onChange={(e) => setNewChatUserId(e.target.value)}
              placeholder={t('Enter User ID to start chat')}
              className="xp-input flex-1 text-sm"
            />
            <button type="submit" className="glossy-btn text-sm px-2 py-1">{t('Start')}</button>
          </form>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('Search contacts or messages...')}
            className="xp-input w-full text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {unknownChats.length > 0 && (
            <div className="mb-4">
              <div className="bg-[#e0e0e0] px-2 py-1 text-xs font-bold text-gray-600 uppercase">
                {t('Unknown (Requests)')}
              </div>
              {unknownChats.map(chat => {
                const otherUserId = chat.participants.find((id: string) => id !== user.uid);
                return (
                  <div
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`p-3 border-b border-[#eee] cursor-pointer hover:bg-[#e6f0fa] ${activeChatId === chat.id ? 'bg-[#d9e4f1]' : ''}`}
                  >
                    <div className="font-bold text-[#003399]">
                      <UserNickname userId={otherUserId} fallbackName={otherUserId} />
                    </div>
                    <div className="text-xs text-gray-500 truncate">{chat.lastMessage || t('No messages yet')}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <div className="bg-[#e0e0e0] px-2 py-1 text-xs font-bold text-gray-600 uppercase">
              {t('Contacts')}
            </div>
            {knownChats.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 text-center">{t('No contacts yet')}</div>
            ) : (
              knownChats.map(chat => {
                const otherUserId = chat.participants.find((id: string) => id !== user.uid);
                return (
                  <div
                    key={chat.id}
                    onClick={() => setActiveChatId(chat.id)}
                    className={`p-3 border-b border-[#eee] cursor-pointer hover:bg-[#e6f0fa] ${activeChatId === chat.id ? 'bg-[#d9e4f1]' : ''}`}
                  >
                    <div className="font-bold text-[#003399]">
                      <UserNickname userId={otherUserId} fallbackName={otherUserId} />
                    </div>
                    <div className="text-xs text-gray-500 truncate">{chat.lastMessage || t('No messages yet')}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="w-2/3 flex flex-col bg-white">
        {activeChatId ? (
          <>
            <div className="p-4 border-b-2 border-[#ccc] bg-[#f4f5f5] flex justify-between items-center">
              <div className="font-bold text-[#003366] text-lg">
                <UserNickname userId={activeOtherUserId} fallbackName={activeOtherUserId} />
              </div>
              {activeChat && (!activeChat.contacts || activeChat.contacts[user.uid] !== true) && (
                <button
                  onClick={() => handleAddToContacts(activeChatId)}
                  className="glossy-btn text-sm"
                >
                  {t('Add to Contacts')}
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {messages.map(msg => {
                const isMine = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`max-w-[70%] p-2 rounded-lg ${isMine ? 'bg-[#d9e4f1] self-end border border-[#7f9db9]' : 'bg-[#f0f0f0] self-start border border-[#ccc]'}`}>
                    <div className="text-sm">{msg.text}</div>
                    <div className="text-[10px] text-gray-500 text-right mt-1">
                      {msg.createdAt ? msg.createdAt.toDate().toLocaleTimeString() : ''}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t-2 border-[#ccc] bg-[#f4f5f5] flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t('Type a message...')}
                className="xp-input flex-1"
              />
              <button type="submit" className="glossy-btn px-6">{t('Send')}</button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            {t('Select a chat or start a new one')}
          </div>
        )}
      </div>
    </div>
  );
}
