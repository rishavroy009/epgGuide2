import React, { useState, useEffect, useRef } from 'react';
import './EPGGuide.css';

// TV Focus Management System
const useTVFocus = () => {
  const [focusedElement, setFocusedElement] = useState(null);
  const elementsRef = useRef(new Map());

  const moveFocus = (direction) => {
    const currentIndex = Array.from(elementsRef.current.keys())
      .indexOf(focusedElement);
    
    let newIndex = currentIndex;
    switch(direction) {
      case 'up': newIndex--; break;
      case 'down': newIndex++; break;
      case 'left': newIndex--; break;
      case 'right': newIndex++; break;
    }

    const newElement = elementsRef.current.get(
      Array.from(elementsRef.current.keys())[newIndex]
    );

    if (newElement) {
      newElement.focus();
      setFocusedElement(newElement);
    }
  };

  return { elementsRef, moveFocus, focusedElement };
};

const EPGGuide = () => {
  // TV Focus System
  const { elementsRef, moveFocus } = useTVFocus();
  
  // State Management
  const [state, setState] = useState({
    startHour: 0,
    currentTime: new Date(),
    channels: generateEPGData().channelInfo,
    focusPath: [0, 0] // [channelIndex, programIndex]
  });

  // Refs
  const containerRef = useRef(null);
  const timeBarRef = useRef(null);

  // Time Synchronization
  useEffect(() => {
    const timer = setInterval(() => {
      setState(prev => ({
        ...prev,
        currentTime: new Date(),
        startHour: calculateOptimalStartHour(prev.startHour, new Date())
      }));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Focus Initialization
  useEffect(() => {
    containerRef.current.focus();
    updateTimeBarScroll();
    scrollToCurrentFocus();
  }, [state.focusPath, state.startHour]);

  // Key Handling
  const handleKeyDown = (e) => {
    const { key } = e;
    const [channelIndex, programIndex] = state.focusPath;
    const visiblePrograms = getVisiblePrograms(channelIndex);

    const navigation = {
      ArrowUp: () => moveVertical(-1),
      ArrowDown: () => moveVertical(1),
      ArrowLeft: () => moveHorizontal(-1),
      ArrowRight: () => moveHorizontal(1)
    };

    if (navigation[key]) {
      e.preventDefault();
      e.stopPropagation();
      navigation[key]();
    }
  };

  // Navigation Logic
  const moveVertical = (delta) => {
    setState(prev => {
      const newIndex = clamp(prev.focusPath[0] + delta, 0, prev.channels.length - 1);
      return {
        ...prev,
        focusPath: [newIndex, 0],
        startHour: calculateOptimalStartHour(prev.startHour, prev.currentTime)
      };
    });
  };

  const moveHorizontal = (delta) => {
    setState(prev => {
      const [channelIndex] = prev.focusPath;
      const visiblePrograms = getVisiblePrograms(channelIndex);
      const newIndex = clamp(prev.focusPath[1] + delta, 0, visiblePrograms.length - 1);
      
      // Handle time window transitions
      const program = visiblePrograms[newIndex];
      if (!program) return prev;

      const newStartHour = calculateNewStartHour(program, prev.startHour);
      
      return {
        ...prev,
        focusPath: [channelIndex, newIndex],
        startHour: newStartHour
      };
    });
  };

  // Scroll Management
  const scrollToCurrentFocus = () => {
    const [channelIndex, programIndex] = state.focusPath;
    const channelRow = elementsRef.current.get(`channel-${channelIndex}`);
    const programCell = elementsRef.current.get(`program-${channelIndex}-${programIndex}`);

    channelRow?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    programCell?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
  };

  // Time Bar Synchronization
  const updateTimeBarScroll = () => {
    const scrollPercentage = (state.startHour / 24) * timeBarRef.current.scrollWidth;
    timeBarRef.current.scrollLeft = scrollPercentage;
  };

  return (
    <div 
      className="epg-container"
      ref={containerRef}
      tabIndex="0"
      onKeyDown={handleKeyDown}
    >
      <TimeBar 
        ref={timeBarRef}
        startHour={state.startHour}
        currentTime={state.currentTime}
      />
      
      <ChannelGrid
        channels={state.channels}
        focusPath={state.focusPath}
        startHour={state.startHour}
        elementsRef={elementsRef}
        currentTime={state.currentTime}
      />
    </div>
  );
};

// Sub-components
const TimeBar = React.forwardRef(({ startHour, currentTime }, ref) => (
  <div className="time-bar" ref={ref}>
    {Array.from({ length: 24 / 4 }).map((_, i) => (
      <TimeBlock 
        key={i}
        hour={i * 4}
        isActive={i * 4 === startHour}
        currentTime={currentTime}
      />
    ))}
  </div>
));

const ChannelGrid = ({ channels, focusPath, startHour, elementsRef, currentTime }) => (
  <div className="channels-grid">
    {channels.map((channel, channelIndex) => (
      <ChannelRow
        key={channel.channelId}
        channel={channel}
        channelIndex={channelIndex}
        focusPath={focusPath}
        startHour={startHour}
        elementsRef={elementsRef}
        currentTime={currentTime}
      />
    ))}
  </div>
);

// Helper functions
const calculateOptimalStartHour = (currentStart, time) => {
  const currentHour = time.getHours();
  return currentHour >= currentStart && currentHour < currentStart + 4 
    ? currentStart 
    : Math.floor(currentHour / 4) * 4;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default EPGGuide;
