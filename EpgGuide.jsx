import React, { useState, useEffect, useRef, useCallback } from 'react';
import './EPGGuide.css';
import { epgData } from './sdk';

const HOURS_WINDOW = 4;
const MINUTES_WINDOW = HOURS_WINDOW * 60;

const EPGGuide = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedChannel, setSelectedChannel] = useState(0);
  const [selectedProgram, setSelectedProgram] = useState(0);
  const [startHour, setStartHour] = useState(0);
  
  const channelsRef = useRef([]);
  const programsRef = useRef([]);
  const containerRef = useRef(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e) => {
    const channelCount = epgData.channels.length;
    const programs = getVisiblePrograms();

    switch(e.key) {
      case 'ArrowUp':
        setSelectedChannel(prev => Math.max(0, prev - 1));
        setSelectedProgram(0);
        break;
      case 'ArrowDown':
        setSelectedChannel(prev => Math.min(channelCount - 1, prev + 1));
        setSelectedProgram(0);
        break;
      case 'ArrowLeft':
        if (selectedProgram > 0) {
          setSelectedProgram(prev => prev - 1);
        } else {
          setStartHour(prev => Math.max(0, prev - HOURS_WINDOW));
        }
        break;
      case 'ArrowRight':
        if (selectedProgram < programs.length - 1) {
          setSelectedProgram(prev => prev + 1);
        } else {
          setStartHour(prev => Math.min(20, prev + HOURS_WINDOW));
        }
        break;
      default:
        return;
    }
    e.preventDefault();
  }, [selectedProgram, startHour]);

  // Scroll to selected elements
  useEffect(() => {
    channelsRef.current[selectedChannel]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
    
    programsRef.current[selectedProgram]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center'
    });
  }, [selectedChannel, selectedProgram, startHour]);

  // Get visible programs for current time window
  const getVisiblePrograms = () => {
    const windowStart = startHour * 60;
    const windowEnd = windowStart + MINUTES_WINDOW;
    
    return epgData.channels[selectedChannel].programs.filter(program => 
      program.startTime < windowEnd && 
      (program.startTime + program.duration) > windowStart
    );
  };

  // Calculate program width percentage
  const calculateProgramWidth = (program) => {
    const windowStart = startHour * 60;
    const windowEnd = windowStart + MINUTES_WINDOW;
    const start = Math.max(program.startTime, windowStart);
    const end = Math.min(program.startTime + program.duration, windowEnd);
    return ((end - start) / MINUTES_WINDOW) * 100;
  };

  // Current time position in percentage
  const currentTimePosition = ((currentTime.getHours() * 60 + currentTime.getMinutes() - startHour * 60) / MINUTES_WINDOW) * 100;

  return (
    <div 
      className="epg-container"
      ref={containerRef}
      tabIndex="0"
      onKeyDown={handleKeyDown}
    >
      {/* Time Bar */}
      <div className="time-bar">
        {Array.from({ length: 24 / HOURS_WINDOW }).map((_, i) => (
          <div
            key={i}
            className="time-slot"
            style={{ width: `${100 / (24 / HOURS_WINDOW)}%` }}
          >
            {`${String(i * HOURS_WINDOW).padStart(2, '0')}:00`}
          </div>
        ))}
      </div>

      {/* Current Time Line */}
      <div 
        className="current-time-line"
        style={{ left: `${currentTimePosition}%` }}
      />

      {/* Channels List */}
      <div className="channels-list">
        {epgData.channels.map((channel, channelIndex) => (
          <div
            key={channel.id}
            className={`channel-row ${selectedChannel === channelIndex ? 'selected' : ''}`}
            ref={el => channelsRef.current[channelIndex] = el}
          >
            <div className="channel-info">{channel.name}</div>
            <div className="programs-row">
              {getVisiblePrograms().map((program, programIndex) => (
                <div
                  key={program.id}
                  className={`program ${selectedProgram === programIndex ? 'selected' : ''}`}
                  ref={el => programsRef.current[programIndex] = el}
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

// Helper function to format minutes
const formatTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export default EPGGuide;
