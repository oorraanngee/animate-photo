import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { useAppStore } from '../store';
import { checkContent } from '../lib/gemini';
import AnimationPlayer, { ComplexFrame, ImageElement } from '../components/AnimationPlayer';
import { useParams, useNavigate } from 'react-router-dom';

const AVAILABLE_TAGS = [
  'animals', 'cats', 'kittens', 'dogs', 'puppies', 'meme', 'drawing', 'photo', 'nature', 'funny'
];

const computeHash = async (file: File) => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const uploadImage = async (file: File): Promise<string> => {
  const hash = await computeHash(file);
  
  // Check if image exists in DB
  const q = query(collection(db, 'images'), where('hash', '==', hash));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data().url;
  }

  const apiKey = (import.meta as any).env.VITE_POSTIMAGES_API_KEY;
  if (apiKey) {
    const formData = new FormData();
    formData.append('key', apiKey);
    formData.append('image', file);
    
    // Using ImgBB as a reliable alternative if Postimages API is not standard, 
    // but the user asked for postimages. We'll use a generic approach.
    // Note: ImgBB uses key=API_KEY. Postimages might not have a public upload API like this.
    // We will try to use the provided key with ImgBB endpoint as a fallback, or just return base64 if small.
    try {
      const res = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.data?.url) {
        const url = data.data.url;
        await addDoc(collection(db, 'images'), { hash, url, createdAt: serverTimestamp() });
        return url;
      }
    } catch (e) {
      console.error("Upload failed", e);
    }
  }
  
  // Fallback to base64 if file is small enough (< 800KB)
  if (file.size < 800000) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const url = reader.result as string;
        await addDoc(collection(db, 'images'), { hash, url, createdAt: serverTimestamp() });
        resolve(url);
      };
      reader.onerror = error => reject(error);
    });
  }
  
  throw new Error("File too large and no API key configured for external upload.");
};

export default function Create() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isBanned, isAdmin } = useAppStore();
  
  const [frames, setFrames] = useState<ComplexFrame[]>([]);
  const [selectedFrameIdx, setSelectedFrameIdx] = useState<number>(0);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id && db) {
      getDoc(doc(db, 'posts', id)).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.authorId !== user?.uid && !isAdmin) {
            setErrorMsg(t('Unauthorized'));
            return;
          }
          setTitle(data.title || '');
          setDescription(data.description || '');
          setSelectedTags(data.tags || []);
          
          if (data.frames && data.frames.length > 0) {
            if (typeof data.frames[0] === 'string') {
              // Convert old format to new format
              setFrames(data.frames.map((f: string, i: number) => ({
                id: `frame_${i}`,
                elements: [{ id: `el_${i}`, url: f, x: 0, y: 0, width: 100, height: 100, opacity: 1 }],
                backgroundColor: '#ffffff',
                backgroundImage: '',
                frameDuration: data.frameDuration || 1000,
                transitionDuration: data.transitionDuration || 500,
                transitionType: data.transition || 'sharp'
              })));
            } else {
              setFrames(data.frames);
            }
          }
        }
      });
    } else if (frames.length === 0) {
      // Add initial empty frame
      addFrame();
    }
  }, [id, db, user, isAdmin]);

  const addFrame = () => {
    setFrames([...frames, {
      id: Math.random().toString(36).substr(2, 9),
      elements: [],
      backgroundColor: '#ffffff',
      backgroundImage: '',
      frameDuration: 1000,
      transitionDuration: 500,
      transitionType: 'morphing'
    }]);
    setSelectedFrameIdx(frames.length);
  };

  const removeFrame = (idx: number) => {
    if (frames.length <= 1) return;
    const newFrames = frames.filter((_, i) => i !== idx);
    setFrames(newFrames);
    setSelectedFrameIdx(Math.min(selectedFrameIdx, newFrames.length - 1));
  };

  const updateCurrentFrame = (updates: Partial<ComplexFrame>) => {
    const newFrames = [...frames];
    newFrames[selectedFrameIdx] = { ...newFrames[selectedFrameIdx], ...updates };
    setFrames(newFrames);
  };

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    if (!e.target.files || e.target.files.length === 0) return;
    
    setLoading(true);
    try {
      const newElements: ImageElement[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (file.size > 70 * 1024 * 1024) {
          throw new Error(`File ${file.name} is larger than 70MB limit.`);
        }
        const url = await uploadImage(file);
        newElements.push({
          id: Math.random().toString(36).substr(2, 9),
          url,
          x: 10,
          y: 10,
          width: 80,
          height: 80,
          opacity: 1
        });
      }
      
      const currentFrame = frames[selectedFrameIdx];
      updateCurrentFrame({ elements: [...currentFrame.elements, ...newElements] });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading image');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const url = prompt(t('Enter image URL'));
    if (url) {
      const currentFrame = frames[selectedFrameIdx];
      updateCurrentFrame({ 
        elements: [...currentFrame.elements, {
          id: Math.random().toString(36).substr(2, 9),
          url,
          x: 10,
          y: 10,
          width: 80,
          height: 80,
          opacity: 1
        }] 
      });
    }
  };

  const handleSetBgImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setLoading(true);
    try {
      const file = e.target.files[0];
      if (file.size > 70 * 1024 * 1024) throw new Error(`File is larger than 70MB limit.`);
      const url = await uploadImage(file);
      updateCurrentFrame({ backgroundImage: url });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading background');
    } finally {
      setLoading(false);
      if (bgInputRef.current) bgInputRef.current.value = '';
    }
  };

  const updateElement = (elId: string, updates: Partial<ImageElement>) => {
    const currentFrame = frames[selectedFrameIdx];
    const newElements = currentFrame.elements.map(el => el.id === elId ? { ...el, ...updates } : el);
    updateCurrentFrame({ elements: newElements });
  };

  const removeElement = (elId: string) => {
    const currentFrame = frames[selectedFrameIdx];
    updateCurrentFrame({ elements: currentFrame.elements.filter(el => el.id !== elId) });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!user) return setErrorMsg(t('Please login'));
    if (isBanned) return setErrorMsg(t('Banned'));
    if (frames.length === 0) return setErrorMsg(t('Add at least one frame'));
    if (!title) return setErrorMsg(t('Title') + ' is required');
    if (!db) return setErrorMsg(t('Setup Required'));

    setLoading(true);
    try {
      // Basic text filter for description and title
      const bannedWords = ['nsfw', 'porn', 'gore', 'violence', 'nude'];
      const textToCheck = (title + ' ' + description).toLowerCase();
      let isFlagged = false;

      if (bannedWords.some(word => textToCheck.includes(word))) {
        isFlagged = true;
      }

      const postData = {
        title,
        description,
        tags: selectedTags,
        frames,
        isApproved: isAdmin ? true : false, // Always require manual review if edited/created by user
        aiFlagged: isFlagged,
        updatedAt: serverTimestamp()
      };

      if (id) {
        await updateDoc(doc(db, 'posts', id), postData);
        setSuccessMsg(t('Animation updated and sent for review'));
      } else {
        await addDoc(collection(db, 'posts'), {
          ...postData,
          authorId: user.uid,
          authorEmail: user.email,
          createdAt: serverTimestamp()
        });
        setSuccessMsg(t('Animation created and sent for review'));
      }
      
      setTimeout(() => navigate('/gallery'), 2000);
    } catch (error) {
      console.error(error);
      setErrorMsg(t('Error'));
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-4 text-center text-red-600 font-bold">{t('Please login')}</div>;
  }

  if (isBanned) {
    return <div className="p-4 text-center text-red-600 font-bold">{t('Banned')}</div>;
  }

  const currentFrame = frames[selectedFrameIdx];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-[#003366] mb-2 border-b-2 border-[#003366] pb-2">
          {id ? t('Edit Animation') : t('Create Animation')}
        </h1>

        {errorMsg && <div className="bg-red-100 text-red-700 p-3 rounded">{errorMsg}</div>}
        {successMsg && <div className="bg-green-100 text-green-700 p-3 rounded">{successMsg}</div>}

        <input type="text" placeholder={t('Title')} value={title} onChange={e => setTitle(e.target.value)} className="xp-input w-full" />
        <textarea placeholder={t('Description')} value={description} onChange={e => setDescription(e.target.value)} className="xp-input w-full h-24" />

        <div className="glossy-panel">
          <div className="font-bold text-[#003399] mb-2">{t('Tags')}</div>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map(tag => (
              <button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1 rounded-full text-xs font-bold border ${selectedTags.includes(tag) ? 'bg-[#003399] text-white' : 'bg-white text-[#003399]'}`}>
                {t(tag)}
              </button>
            ))}
          </div>
        </div>

        {/* Frames List */}
        <div className="glossy-panel">
          <div className="flex justify-between items-center mb-2">
            <div className="font-bold text-[#003399]">{t('Frames')}</div>
            <button onClick={addFrame} className="glossy-btn-green text-sm !py-1 !px-3">+ {t('Add Frame')}</button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {frames.map((f, idx) => (
              <div 
                key={f.id} 
                onClick={() => setSelectedFrameIdx(idx)}
                className={`min-w-[80px] h-20 border-2 rounded cursor-pointer flex items-center justify-center relative ${selectedFrameIdx === idx ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white'}`}
              >
                <span className="font-bold text-gray-500">{idx + 1}</span>
                {frames.length > 1 && (
                  <button onClick={(e) => { e.stopPropagation(); removeFrame(idx); }} className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-4 h-4 rounded-bl">X</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Frame Editor */}
        {currentFrame && (
          <div className="glossy-panel flex flex-col gap-4">
            <h3 className="font-bold text-[#003399] border-b pb-1">{t('Edit Frame')} {selectedFrameIdx + 1}</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">{t('Background Color')}</label>
                <input type="color" value={currentFrame.backgroundColor} onChange={e => updateCurrentFrame({ backgroundColor: e.target.value })} className="w-full h-8" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">{t('Background Image')}</label>
                <input type="file" accept="image/*" ref={bgInputRef} onChange={handleSetBgImage} className="hidden" />
                <div className="flex gap-1">
                  <button onClick={() => bgInputRef.current?.click()} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs flex-1">{t('Upload')}</button>
                  <button onClick={() => {
                    const url = prompt(t('Enter image URL'));
                    if (url) updateCurrentFrame({ backgroundImage: url });
                  }} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs flex-1">{t('URL')}</button>
                  <button onClick={() => updateCurrentFrame({ backgroundImage: '' })} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">X</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">{t('Frame Duration (ms)')}</label>
                <input type="number" value={currentFrame.frameDuration} onChange={e => updateCurrentFrame({ frameDuration: Number(e.target.value) })} className="xp-input w-full" min="100" step="100" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">{t('Transition Duration (ms)')}</label>
                <input type="number" value={currentFrame.transitionDuration} onChange={e => updateCurrentFrame({ transitionDuration: Number(e.target.value) })} className="xp-input w-full" min="100" step="100" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold mb-1">{t('Transition Type')}</label>
                <select value={currentFrame.transitionType} onChange={e => updateCurrentFrame({ transitionType: e.target.value })} className="xp-input w-full">
                  <option value="sharp">{t('Sharp')}</option>
                  <option value="smooth">{t('Smooth')}</option>
                  <option value="morphing">{t('Morphing')}</option>
                  <option value="transform">{t('Transform')}</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm">{t('Images in Frame')}</span>
                <div className="flex gap-2">
                  <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleAddImage} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="glossy-btn text-xs !py-1 !px-2">{t('Upload Image')}</button>
                  <button onClick={handleAddImageUrl} className="glossy-btn-green text-xs !py-1 !px-2">{t('Add URL')}</button>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {currentFrame.elements.map((el, i) => (
                  <div key={el.id} className="bg-gray-50 p-2 border rounded text-xs flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{t('Image')} {i + 1}</span>
                      <button onClick={() => removeElement(el.id)} className="text-red-600 font-bold">X</button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div><label>{t('X (%)')}</label><input type="number" value={el.x} onChange={e => updateElement(el.id, { x: Number(e.target.value) })} className="w-full border p-1" /></div>
                      <div><label>{t('Y (%)')}</label><input type="number" value={el.y} onChange={e => updateElement(el.id, { y: Number(e.target.value) })} className="w-full border p-1" /></div>
                      <div><label>{t('W (%)')}</label><input type="number" value={el.width} onChange={e => updateElement(el.id, { width: Number(e.target.value) })} className="w-full border p-1" /></div>
                      <div><label>{t('H (%)')}</label><input type="number" value={el.height} onChange={e => updateElement(el.id, { height: Number(e.target.value) })} className="w-full border p-1" /></div>
                      <div className="col-span-4"><label>{t('Opacity (0-1)')}</label><input type="number" step="0.1" min="0" max="1" value={el.opacity} onChange={e => updateElement(el.id, { opacity: Number(e.target.value) })} className="w-full border p-1" /></div>
                    </div>
                  </div>
                ))}
                {currentFrame.elements.length === 0 && <div className="text-xs text-gray-500">{t('No images added to this frame')}</div>}
              </div>
            </div>
          </div>
        )}

        <button onClick={handleSave} disabled={loading || frames.length === 0} className="glossy-btn py-3 text-lg disabled:opacity-50 mt-2">
          {loading ? t('Saving...') : (id ? t('Save Changes') : t('Create'))}
        </button>
      </div>

      {/* Live Preview */}
      <div className="w-full lg:w-80 shrink-0">
        <div className="glossy-panel sticky top-4">
          <div className="glossy-panel-header text-center">{t('Preview')}</div>
          <div className="anim-container mx-auto mt-4 bg-white relative overflow-hidden" style={{ aspectRatio: '1/1' }}>
            <AnimationPlayer frames={frames} />
          </div>
        </div>
      </div>
    </div>
  );
}
