import React, { useState, useEffect, useRef } from 'react';
import './EPGGuide.css';
const formatHour = (hour) => `${(hour % 24).toString().padStart(2, '0')}:00`;
const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

const generateEPGData = () => {
  const channels = [];
  const PROGRAM_TYPES = [
    'News', 'Movie', 'Talk Show', 'Sports', 'Documentary', 
    'Reality TV', 'Cartoon', 'Cooking Show', 'Drama Series', 'Live Music'
  ];

  // Generate 40 channels
  for (let channelId = 1; channelId <= 40; channelId++) {
    const programs = [];
    let currentTime = 0; // Start at midnight
    
    // Generate 30 programs per channel
    for (let programIndex = 0; programIndex < 30; programIndex++) {
      const durationOptions = [15, 30, 45, 60, 90, 120];
      const duration = durationOptions[Math.floor(Math.random() * durationOptions.length)];
      const type = PROGRAM_TYPES[Math.floor(Math.random() * PROGRAM_TYPES.length)];
      
      programs.push({
        index: programIndex,
        name: `${type} ${Math.floor(Math.random() * 1000)}`,
        startTime: currentTime,
        duration: duration,
        description: `${type} program airing at ${formatTime(currentTime)}`,
        endTime: currentTime + duration
      });

      currentTime += duration;
      if (currentTime >= 1440) break; // Stop if exceeding 24h
    }

    channels.push({
      channelId: channelId,
      name: `Channel ${channelId.toString().padStart(2, '0')}`,
      programs: programs
    });
  }

  return { channelInfo: channels };
};

const epgData = generateEPGData();
const HOURS_WINDOW = 4;
const MINUTES_IN_WINDOW = HOURS_WINDOW * 60;

const EPGGuide = () => {
  const [startHour, setStartHour] = useState(0);
  const [selectedChannelIndex, setSelectedChannelIndex] = useState(0);
  const [selectedProgramIndex, setSelectedProgramIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const channelsGridRef = useRef(null);
  const programContainersRef = useRef([]);
  const channelRowsRef = useRef([]);
  const scrollTimeoutRef = useRef(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      const moveSelection = (channelDelta, programDelta) => {
        // Channel navigation
        if (channelDelta !== 0) {
          const newChannelIndex = Math.max(0, 
            Math.min(epgData.channelInfo.length - 1, selectedChannelIndex + channelDelta));
          setSelectedChannelIndex(newChannelIndex);
          setSelectedProgramIndex(0);
          channelRowsRef.current[newChannelIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
          return;
        }

        // Program navigation
        const visiblePrograms = getVisiblePrograms(epgData.channelInfo[selectedChannelIndex]);
        const newIndex = selectedProgramIndex + programDelta;

        // Handle time window transitions
        if (newIndex >= visiblePrograms.length) {
          const nextHour = Math.min(20, startHour + HOURS_WINDOW);
          if (nextHour !== startHour) {
            setStartHour(nextHour);
            setSelectedProgramIndex(0);
            return;
          }
        } else if (newIndex < 0) {
          const prevHour = Math.max(0, startHour - HOURS_WINDOW);
          if (prevHour !== startHour) {
            setStartHour(prevHour);
            setSelectedProgramIndex(getVisiblePrograms(
              epgData.channelInfo[selectedChannelIndex]
            ).length - 1);
            return;
          }
        }

        const clampedIndex = Math.max(0, Math.min(visiblePrograms.length - 1, newIndex));
        if (clampedIndex !== selectedProgramIndex) {
          setSelectedProgramIndex(clampedIndex);
          scrollToProgram(clampedIndex);
        }
      };

      switch(e.key) {
        case 'ArrowUp': moveSelection(-1, 0); break;
        case 'ArrowDown': moveSelection(1, 0); break;
        case 'ArrowLeft': moveSelection(0, -1); break;
        case 'ArrowRight': moveSelection(0, 1); break;
        default: return;
      }
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedChannelIndex, selectedProgramIndex, startHour]);

  // Reset scroll position on time window change
  useEffect(() => {
    const container = programContainersRef.current[selectedChannelIndex];
    container?.scrollTo({ left: 0, behavior: 'auto' });
  }, [startHour, selectedChannelIndex]);

  // Get programs visible in current time window
  const getVisiblePrograms = (channel) => {
    const windowStart = startHour * 60;
    const windowEnd = windowStart + MINUTES_IN_WINDOW;
    return channel.programs.filter(p => 
      p.startTime < windowEnd && 
      p.endTime > windowStart
    );
  };

  // Calculate program widths based on visible duration
  const calculateProgramWidths = (programs) => {
    const totalDuration = programs.reduce((sum, p) => {
      const visibleStart = Math.max(p.startTime, startHour * 60);
      const visibleEnd = Math.min(p.endTime, (startHour + HOURS_WINDOW) * 60);
      return sum + (visibleEnd - visibleStart);
    }, 0);

    return programs.map(p => {
      const visibleStart = Math.max(p.startTime, startHour * 60);
      const visibleEnd = Math.min(p.endTime, (startHour + HOURS_WINDOW) * 60);
      return ((visibleEnd - visibleStart) / totalDuration) * 100;
    });
  };

  // Smooth scroll to program
  const scrollToProgram = (programIndex) => {
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const container = programContainersRef.current[selectedChannelIndex];
      const programElements = container?.querySelectorAll('.program');
      if (programElements?.[programIndex]) {
        const programElement = programElements[programIndex];
        const scrollLeft = programElement.offsetLeft - 
          (container.offsetWidth / 2) + 
          (programElement.offsetWidth / 2);
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }, 50);
  };

  // Calculate current time position
  const currentTimePosition = () => {
    const minutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    return ((minutes - startHour * 60) / MINUTES_IN_WINDOW) * 100;
  };



  return (
    <div className="epg-container">
      {/* Time Bar */}
      <div className="time-bar">
        {Array.from({ length: 24 / HOURS_WINDOW }, (_, i) => {
          const hour = i * HOURS_WINDOW;
          return (
            <div 
              key={hour}
              className={`time-block ${startHour === hour ? 'active' : ''}`}
              style={{ width: `${100 / (24 / HOURS_WINDOW)}%` }}
              onClick={() => setStartHour(hour)}
            >
              {`${formatHour(hour)} - ${formatHour(hour + HOURS_WINDOW)}`}
            </div>
          );
        })}
      </div>

      {/* Current Time Line */}
      <div 
        className="current-time-line"
        style={{ left: `${currentTimePosition()}%` }}
      />

      {/* Channels Grid */}
      <div className="channels-grid" ref={channelsGridRef}>
        {epgData.channelInfo.map((channel, channelIndex) => {
          const visiblePrograms = getVisiblePrograms(channel);
          const programWidths = calculateProgramWidths(visiblePrograms);

          return (
            <div 
              key={channel.channelId}
              className={`channel-row ${selectedChannelIndex === channelIndex ? 'selected-channel' : ''}`}
              ref={el => channelRowsRef.current[channelIndex] = el}
            >
              <div className="channel-name">{channel.name}</div>
              <div 
                className="programs-container"
                ref={el => programContainersRef.current[channelIndex] = el}
              >
                {visiblePrograms.map((program, programIndex) => (
                  <div
                    key={program.index}
                    className={`program ${selectedProgramIndex === programIndex && 
                      selectedChannelIndex === channelIndex ? 'selected' : ''}`}
                    style={{ width: `${programWidths[programIndex]}%` }}
                  >
                    <div className="program-title">{program.name}</div>
                    <div className="program-time">
                      {`${formatTime(program.startTime)} - ${formatTime(program.endTime)}`}
                    </div>
                    {selectedProgramIndex === programIndex && 
                      selectedChannelIndex === channelIndex && (
                        <div className="program-description">{program.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper functions

export default EPGGuide;