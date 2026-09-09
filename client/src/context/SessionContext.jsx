import React, { createContext, useState, useContext } from 'react';
import axios from 'axios';

const SessionContext = createContext();

export const useSession = () => useContext(SessionContext);

const API_URL = 'http://localhost:5000/api/session';

export const SessionProvider = ({ children }) => {
  const [session, setSession] = useState(() => {
    const stored = localStorage.getItem('anon_session');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading] = useState(false);

  const createSession = async (username) => {
    const { data } = await axios.post(`${API_URL}/create`, { username });
    const sessionData = {
      sessionId: data.sessionId,
      roomCode: data.roomCode,
      username: data.username,
    };
    localStorage.setItem('anon_session', JSON.stringify(sessionData));
    setSession(sessionData);
    return sessionData;
  };

  const joinSession = async (username, roomCode) => {
    const { data } = await axios.post(`${API_URL}/join`, { username, roomCode });
    const sessionData = {
      sessionId: data.sessionId,
      roomCode: data.roomCode,
      username: data.username,
    };
    localStorage.setItem('anon_session', JSON.stringify(sessionData));
    setSession(sessionData);
    return sessionData;
  };

  const leaveSession = async () => {
    if (session) {
      try {
        await axios.post(`${API_URL}/leave`, {
          sessionId: session.sessionId,
          roomCode: session.roomCode,
        });
      } catch (error) {
        console.error('leave error:', error);
      }
    }
    localStorage.removeItem('anon_session');
    setSession(null);
  };

  return (
    <SessionContext.Provider value={{ session, loading, createSession, joinSession, leaveSession }}>
      {!loading && children}
    </SessionContext.Provider>
  );
};
