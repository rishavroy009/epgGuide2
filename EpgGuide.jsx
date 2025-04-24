import React, { useState, useEffect, useRef } from 'react';
import './EPGGuide.css';

const generateEPGData = () => {
  // ... keep the same mock data generator from previous implementations ...
};

const epgData = generateEPGData();
const HOURS_WINDOW = 4;
const MINUTES_IN_WINDOW = HOURS_WINDOW * 60;

const EPGGuide = () => {
  const [startHour, setStartHour] = useState(0);
  const [selectedChannelIndex, setSelectedChannelIndex] = useState(0);
  const [selectedProgramIndex, setSelectedProgramIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const containerRef = useRef(null);
  const channelRowsRef = useRef([]);
  const programContainersRef = useRef([]);

  // Focus container on mount
  useEffect(() => {
    containerRef.current.focus();
  }, []);

  // Handle current time updates
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = (e) => {
    const moveSelection = (channelDelta, programDelta) => {
      // Channel navigation
      if (channelDelta !== 0) {
        const newIndex = Math.max(0, 
          Math.min(epgData.channelInfo.length - 1, selectedChannelIndex + channelDelta));
        setSelectedChannelIndex(newIndex);
        setSelectedProgramIndex(0);
        channelRowsRef.current[newIndex]?.scrollIntoView({
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
    e.stopPropagation();
  };

  // Scroll to program
  const scrollToProgram = (index) => {
    const container = programContainersRef.current[selectedChannelIndex];
    const programElements = container?.querySelectorAll('.program');
    if (programElements?.[index]) {
      programElements[index].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  };

  // Get visible programs
  const getVisiblePrograms = (channel) => {
    const windowStart = startHour * 60;
    const windowEnd = windowStart + MINUTES_IN_WINDOW;
    return channel.programs.filter(p => 
      p.startTime < windowEnd && 
      p.endTime > windowStart
    );
  };

  // Calculate program widths
  const calculateProgramWidths = (programs) => {
    const totalDuration = programs.reduce((sum, p) => {
      const visibleStart = Math.max(p.startTime, startHour * 60);
      const visibleEnd = Math.min(p.endTime, (startHour + HOURS_WINDOW) * 60);
      return sum + (visibleEnd - visibleStart);
    }, 0);

    return programs.map(p => {
      const visibleStart = Math.max(p.startTime, startHour * 60);
      const visibleEnd = Math.min(p.endTime, (startHour + HOURS_WINDOW) * 60);
      return `${((visibleEnd - visibleStart) / totalDuration * 100).toFixed(2)}%`;
    });
  };

  return (
    <div 
      className="epg-container"
      ref={containerRef}
      tabIndex="0"
      onKeyDown={handleKeyDown}
    >
      {/* Time Bar */}
      <div className="time-bar">
        {Array.from({ length: 24 / HOURS_WINDOW }, (_, i) => {
          const hour = i * HOURS_WINDOW;
          return (
            <div 
              key={hour}
              className={`time-block ${startHour === hour ? 'active' : ''}`}
              style={{ width: `${100 / (24 / HOURS_WINDOW)}%` }}
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
      <div className="channels-grid">
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
                    style={{ width: programWidths[programIndex] }}
                  >
                    <div className="program-title">{program.name}</div>
                    <div className="program-time">
                      {`${formatTime(program.startTime)} - ${formatTime(program.endTime)}`}
                    </div>
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
const formatHour = (hour) => `${(hour % 24).toString().padStart(2, '0')}:00`;
const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export default EPGGuide;
