import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAppStore } from '../store';
import { checkContent } from '../lib/gemini';

interface FrameData {
  id: string;
  file: File;
  preview: string;
}

const AVAILABLE_TAGS = [
  'animals', 'cats', 'kittens', 'dogs', 'puppies', 'meme', 'drawing', 'photo', 'nature', 'funny'
];

export default function Create() {
  const { t } = useTranslation();
  const { user, isBanned } = useAppStore();
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [transition, setTransition] = useState<'sharp' | 'smooth' | 'transform'>('sharp');
  const [frameDuration, setFrameDuration] = useState(1000);
  const [transitionDuration, setTransitionDuration] = useState(500);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (e.target.files) {
      const newFrames = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file as Blob)
      }));
      setFrames(prev => [...prev, ...newFrames]);
    }
  };

  const moveFrame = (index: number, direction: 'up' | 'down') => {
    const newFrames = [...frames];
    if (direction === 'up' && index > 0) {
      [newFrames[index - 1], newFrames[index]] = [newFrames[index], newFrames[index - 1]];
    } else if (direction === 'down' && index < newFrames.length - 1) {
      [newFrames[index + 1], newFrames[index]] = [newFrames[index], newFrames[index + 1]];
    }
    setFrames(newFrames);
  };

  const duplicateFrame = (index: number) => {
    const frameToCopy = frames[index];
    const newFrame = {
      id: Math.random().toString(36).substr(2, 9),
      file: frameToCopy.file,
      preview: frameToCopy.preview
    };
    const newFrames = [...frames];
    newFrames.splice(index + 1, 0, newFrame);
    setFrames(newFrames);
  };

  const removeFrame = (index: number) => {
    setFrames(frames.filter((_, i) => i !== index));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleCreate = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!user) return setErrorMsg(t('Please login'));
    if (isBanned) return setErrorMsg(t('Banned'));
    if (frames.length === 0) return setErrorMsg(t('Select Images'));
    if (frames.length === 1 && frames[0].file.type !== 'image/gif') return setErrorMsg(t('Select Images'));
    
    const totalSize = frames.reduce((acc, frame) => acc + frame.file.size, 0);
    if (totalSize > 800000) return setErrorMsg('Total file size must be less than 800KB');

    if (!title) return setErrorMsg(t('Title') + ' is required');
    if (!db) return setErrorMsg(t('Setup Required'));

    setLoading(true);
    try {
      const base64Frames = await Promise.all(frames.map(f => fileToBase64(f.file)));

      // Basic text filter for description and title
      const bannedWords = ['nsfw', 'porn', 'gore', 'violence', 'nude'];
      const textToCheck = (title + ' ' + description).toLowerCase();
      if (bannedWords.some(word => textToCheck.includes(word))) {
        setErrorMsg(t('Content flagged'));
        setLoading(false);
        return;
      }

      for (let i = 0; i < base64Frames.length; i++) {
        const isFlagged = await checkContent(base64Frames[i], frames[i].file.type);
        if (isFlagged) {
          setErrorMsg(t('Content flagged'));
          setLoading(false);
          return;
        }
      }

      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorEmail: user.email,
        title,
        description,
        tags: selectedTags,
        frames: base64Frames,
        transition,
        frameDuration,
        transitionDuration,
        isApproved: false,
        createdAt: serverTimestamp()
      });

      setSuccessMsg(t('Animation created'));
      setFrames([]);
      setTitle('');
      setDescription('');
      setSelectedTags([]);
    } catch (error) {
      console.error(error);
      setErrorMsg(t('Error'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded relative text-center shadow-md">
          <span className="block sm:inline text-lg font-bold">{t('Please login')}</span>
        </div>
      </div>
    );
  }

  if (isBanned) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded relative text-center shadow-md">
          <span className="block sm:inline text-lg font-bold">{t('Banned')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-[#003366] mb-2 border-b-2 border-[#003366] pb-2">
          {t('Create Animation')}
        </h1>

        {errorMsg && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{successMsg}</span>
          </div>
        )}

        <input 
          type="text" 
          placeholder={t('Title')} 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          className="xp-input w-full"
        />
        
        <textarea 
          placeholder={t('Description')} 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          className="xp-input w-full h-24"
        />

        <div className="glossy-panel">
          <div className="font-bold text-[#003399] mb-2">{t('Tags')}</div>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                  selectedTags.includes(tag) 
                    ? 'bg-[#003399] text-white border-[#003399]' 
                    : 'bg-white text-[#003399] border-[#003399] hover:bg-blue-50'
                }`}
              >
                {t(tag)}
              </button>
            ))}
          </div>
        </div>

        <div className="glossy-panel">
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleFileChange} 
            ref={fileInputRef}
            className="hidden"
          />
          <button onClick={() => fileInputRef.current?.click()} className="glossy-btn w-full mb-4">
            {t('Select Images')}
          </button>
          
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2">
            {frames.map((frame, idx) => (
              <div key={frame.id} className="flex items-center gap-2 bg-white p-2 border border-[#ccc] rounded">
                <span className="font-bold text-gray-500 w-6">{idx + 1}.</span>
                <img src={frame.preview} className="h-12 w-12 object-cover border border-[#003366]" alt={`preview ${idx}`} />
                <div className="flex-1 text-xs truncate" title={frame.file.name}>{frame.file.name}</div>
                <div className="flex gap-1">
                  <button onClick={() => moveFrame(idx, 'up')} disabled={idx === 0} className="glossy-btn !px-2 !py-1">↑</button>
                  <button onClick={() => moveFrame(idx, 'down')} disabled={idx === frames.length - 1} className="glossy-btn !px-2 !py-1">↓</button>
                  <button onClick={() => duplicateFrame(idx)} className="glossy-btn !px-2 !py-1" title="Duplicate">++</button>
                  <button onClick={() => removeFrame(idx)} className="glossy-btn !px-2 !py-1 !text-red-600">X</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glossy-panel flex flex-col gap-3">
          <div className="flex gap-4 items-center">
            <label className="font-bold w-40">{t('Transition')}:</label>
            <select 
              value={transition} 
              onChange={e => setTransition(e.target.value as 'sharp' | 'smooth' | 'transform')}
              className="xp-input flex-1"
            >
              <option value="sharp">{t('Sharp')}</option>
              <option value="smooth">{t('Smooth')}</option>
              <option value="transform">{t('Transform')}</option>
            </select>
          </div>
          <div className="flex gap-4 items-center">
            <label className="font-bold w-40">{t('Frame Time (ms):')}</label>
            <input 
              type="number" 
              value={frameDuration} 
              onChange={e => setFrameDuration(Number(e.target.value))} 
              className="xp-input flex-1"
              min="100"
              step="100"
            />
          </div>
          {(transition === 'smooth' || transition === 'transform') && (
            <div className="flex gap-4 items-center">
              <label className="font-bold w-40">{t('Transition (ms):')}</label>
              <input 
                type="number" 
                value={transitionDuration} 
                onChange={e => setTransitionDuration(Number(e.target.value))} 
                className="xp-input flex-1"
                min="100"
                step="100"
              />
            </div>
          )}
        </div>

        <button 
          onClick={handleCreate} 
          disabled={loading || frames.length === 0 || (frames.length === 1 && frames[0].file.type !== 'image/gif')} 
          className="glossy-btn py-3 text-lg disabled:opacity-50 mt-2"
        >
          {loading ? t('Uploading...') : t('Create')}
        </button>
      </div>

      {/* Live Preview */}
      <div className="w-full lg:w-80 shrink-0">
        <div className="glossy-panel sticky top-4">
          <div className="glossy-panel-header text-center">{t('Preview')}</div>
          <div className="anim-container mx-auto mt-4 bg-white">
            <LivePreviewPlayer 
              frames={frames.map(f => f.preview)} 
              transition={transition} 
              frameDuration={frameDuration}
              transitionDuration={transitionDuration}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LivePreviewPlayer({ frames, transition, frameDuration, transitionDuration }: { frames: string[], transition: string, frameDuration: number, transitionDuration: number }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!frames || frames.length < 2) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % frames.length);
    }, frameDuration);

    return () => clearInterval(interval);
  }, [frames, frameDuration]);

  if (!frames || frames.length === 0) return <div className="flex items-center justify-center h-full text-gray-400">No images</div>;
  if (frames.length === 1) return <img src={frames[0]} className="anim-frame" alt="frame" />;

  const getTransitionStyle = (idx: number) => {
    const isActive = currentIndex === idx;
    
    if (transition === 'sharp') {
      return { opacity: isActive ? 1 : 0 };
    }
    
    if (transition === 'smooth') {
      return { 
        opacity: isActive ? 1 : 0,
        transition: `opacity ${transitionDuration}ms ease-in-out`
      };
    }
    
    if (transition === 'transform') {
      return {
        opacity: isActive ? 1 : 0,
        transform: isActive ? 'scale(1) rotate(0deg)' : 'scale(0.8) rotate(-5deg)',
        transition: `all ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`
      };
    }
    
    return {};
  };

  return (
    <>
      {frames.map((frame, idx) => (
        <img
          key={idx}
          src={frame}
          className="anim-frame"
          style={getTransitionStyle(idx)}
          alt={`frame ${idx}`}
        />
      ))}
    </>
  );
}
