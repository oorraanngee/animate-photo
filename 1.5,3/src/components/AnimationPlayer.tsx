import React, { useState, useEffect } from 'react';

export interface ImageElement {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

export interface ComplexFrame {
  id: string;
  elements: ImageElement[];
  backgroundColor: string;
  backgroundImage: string;
  frameDuration: number;
  transitionDuration: number;
  transitionType: string;
}

export default function AnimationPlayer({ 
  frames, 
  transition, 
  frameDuration, 
  transitionDuration 
}: { 
  frames: any[], 
  transition?: string, 
  frameDuration?: number, 
  transitionDuration?: number 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!frames || frames.length < 2) return;
    
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const nextFrame = () => {
      if (!isMounted) return;
      const currentFrame = frames[currentIndex];
      const duration = typeof currentFrame === 'string' 
        ? (frameDuration || 1000) 
        : (currentFrame.frameDuration || 1000);
        
      timeoutId = setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % frames.length);
      }, duration);
    };

    nextFrame();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [frames, currentIndex, frameDuration]);

  if (!frames || frames.length === 0) return <div className="flex items-center justify-center h-full text-gray-400">No images</div>;
  
  const isComplex = typeof frames[0] !== 'string';

  if (frames.length === 1) {
    if (!isComplex) return <img src={frames[0]} className="anim-frame" alt="frame" />;
    const f = frames[0] as ComplexFrame;
    return (
      <div className="anim-frame overflow-hidden relative" style={{ backgroundColor: f.backgroundColor || 'transparent' }}>
        {f.backgroundImage && <img src={f.backgroundImage} className="absolute inset-0 w-full h-full object-cover" alt="bg" />}
        {f.elements.map(el => (
          <img key={el.id} src={el.url} className="absolute" style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, opacity: el.opacity }} alt="el" />
        ))}
      </div>
    );
  }

  const getTransitionStyle = (idx: number) => {
    const isActive = currentIndex === idx;
    const currentFrame = frames[currentIndex];
    
    const tType = isComplex ? currentFrame.transitionType : transition;
    const tDur = isComplex ? currentFrame.transitionDuration : transitionDuration;
    
    if (tType === 'sharp') {
      return { opacity: isActive ? 1 : 0 };
    }
    
    if (tType === 'smooth') {
      return { 
        opacity: isActive ? 1 : 0,
        transition: `opacity ${tDur || 500}ms ease-in-out`
      };
    }
    
    if (tType === 'morphing') {
      return { 
        opacity: isActive ? 1 : 0,
        filter: isActive ? 'blur(0px)' : 'blur(10px)',
        transform: isActive ? 'scale(1)' : 'scale(1.05)',
        transition: `all ${tDur || 500}ms ease-in-out`
      };
    }
    
    if (tType === 'transform') {
      return {
        opacity: isActive ? 1 : 0,
        transform: isActive ? 'scale(1) rotate(0deg)' : 'scale(0.8) rotate(-5deg)',
        transition: `all ${tDur || 500}ms cubic-bezier(0.4, 0, 0.2, 1)`
      };
    }
    
    return { opacity: isActive ? 1 : 0 };
  };

  return (
    <>
      {frames.map((frame, idx) => {
        if (!isComplex) {
          return (
            <img
              key={idx}
              src={frame}
              className="anim-frame absolute inset-0 w-full h-full object-contain"
              style={getTransitionStyle(idx)}
              alt={`frame ${idx}`}
            />
          );
        }
        
        const f = frame as ComplexFrame;
        return (
          <div 
            key={f.id} 
            className="anim-frame absolute inset-0 w-full h-full overflow-hidden" 
            style={{ ...getTransitionStyle(idx), backgroundColor: f.backgroundColor || 'transparent' }}
          >
            {f.backgroundImage && <img src={f.backgroundImage} className="absolute inset-0 w-full h-full object-cover" alt="bg" />}
            {f.elements.map(el => (
              <img key={el.id} src={el.url} className="absolute object-contain" style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.width}%`, height: `${el.height}%`, opacity: el.opacity }} alt="el" />
            ))}
          </div>
        );
      })}
    </>
  );
}
