import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useSession } from './SessionContext';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { session } = useSession();

  useEffect(() => {
    if (!session?.sessionId) return;

    const newSocket = io('http://localhost:5000', {
      withCredentials: true,
    });
    setSocket(newSocket);

    return () => {
      newSocket.close();
      setSocket(null);
    };
  }, [session?.sessionId]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
