import React, { useState, useEffect, useRef } from 'react';
import './EPGGuide.css';
import { epgData } from './sdk'; // Import from your SDK

const HOURS_WINDOW = 4;
const MINUTES_IN_WINDOW = HOURS_WINDOW * 60;

const EPGGuide = () => {
  const [selectedChannelIndex, setSelectedChannelIndex] = useState(0);
  const [selectedProgramIndex, setSelectedProgramIndex] = useState(0);
  const [startHour, setStartHour] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const channelsContainerRef = useRef(null);
  const programsContainerRef = useRef(null);
  const timeBarRef = useRef(null);

  // Focus management
  useEffect(() => {
    channelsContainerRef.current.focus();
  }, []);

  // Current time updates
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard navigation
  const handleKeyPress = (e) => {
    const channelCount = epgData.channels.length;
    const visiblePrograms = getVisiblePrograms();
    
    switch(e.key) {
      case 'ArrowUp':
        setSelectedChannelIndex(prev => Math.max(0, prev - 1));
        setSelectedProgramIndex(0);
        break;
      case 'ArrowDown':
        setSelectedChannelIndex(prev => Math.min(channelCount - 1, prev + 1));
        setSelectedProgramIndex(0);
        break;
      case 'ArrowLeft': {
        const newIndex = selectedProgramIndex - 1;
        if (newIndex >= 0) {
          setSelectedProgramIndex(newIndex);
        } else {
          setStartHour(prev => Math.max(0, prev - HOURS_WINDOW));
        }
        break;
      }
      case 'ArrowRight': {
        const newIndex = selectedProgramIndex + 1;
        if (newIndex < visiblePrograms.length) {
          setSelectedProgramIndex(newIndex);
        } else {
          setStartHour(prev => Math.min(20, prev + HOURS_WINDOW));
        }
        break;
      }
      default:
        return;
    }
    e.preventDefault();
  };

  // Scroll to selected elements
  useEffect(() => {
    const channelElement = document.querySelector(`.channel-row[data-index="${selectedChannelIndex}"]`);
    const programElement = document.querySelector(`.program[data-index="${selectedProgramIndex}"]`);
    
    channelElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    programElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    
    // Sync time bar scroll
    const timeBarScroll = (startHour / 24) * timeBarRef.current.scrollWidth;
    timeBarRef.current.scrollTo({ left: timeBarScroll, behavior: 'smooth' });
  }, [selectedChannelIndex, selectedProgramIndex, startHour]);

  // Get programs in current time window
  const getVisiblePrograms = () => {
    const channel = epgData.channels[selectedChannelIndex];
    const windowStart = startHour * 60;
    const windowEnd = windowStart + MINUTES_IN_WINDOW;
    
    return channel.programs.filter(program => 
      program.startTime < windowEnd && 
      (program.startTime + program.duration) > windowStart
    );
  };

  // Calculate program width
  const calculateProgramWidth = (program) => {
    const windowStart = startHour * 60;
    const windowEnd = windowStart + MINUTES_IN_WINDOW;
    const start = Math.max(program.startTime, windowStart);
    const end = Math.min(program.startTime + program.duration, windowEnd);
    return ((end - start) / MINUTES_IN_WINDOW) * 100;
  };

  // Current time position
  const currentTimePosition = () => {
    const minutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    return ((minutes - startHour * 60) / MINUTES_IN_WINDOW) * 100;
  };

  return (
    <div className="epg-container" tabIndex="0" onKeyDown={handleKeyPress}>
      {/* Time Bar */}
      <div className="time-bar" ref={timeBarRef}>
        {Array.from({ length: 24 / HOURS_WINDOW }).map((_, i) => (
          <div 
            key={i}
            className="time-block"
            style={{ width: `${100 / (24 / HOURS_WINDOW)}%` }}
            onClick={() => setStartHour(i * HOURS_WINDOW)}
          >
            {`${String(i * HOURS_WINDOW).padStart(2, '0')}:00 - ${String((i + 1) * HOURS_WINDOW).padStart(2, '0')}:00`}
          </div>
        ))}
      </div>

      {/* Current Time Line */}
      <div 
        className="current-time-line"
        style={{ left: `${currentTimePosition()}%` }}
      />

      {/* Channels List */}
      <div className="channels-container" ref={channelsContainerRef}>
        {epgData.channels.map((channel, channelIndex) => (
          <div 
            key={channel.id}
            className={`channel-row ${selectedChannelIndex === channelIndex ? 'selected' : ''}`}
            data-index={channelIndex}
          >
            <div className="channel-name">{channel.name}</div>
            <div className="programs-container">
              {getVisiblePrograms(channel).map((program, programIndex) => (
                <div
                  key={program.id}
                  className={`program ${selectedProgramIndex === programIndex ? 'selected' : ''}`}
                  data-index={programIndex}
                  style={{ width: `${calculateProgramWidth(program)}%` }}
                >
                  <div className="program-title">{program.title}</div>
                  <div className="program-time">
                    {`${formatTime(program.startTime)} - ${formatTime(program.startTime + program.duration)}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to format minutes to HH:MM
const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export default EPGGuide;
