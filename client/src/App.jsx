import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider, useSession } from './context/SessionContext';
import { SocketProvider } from './context/SocketContext';
import Home from './pages/Home';
import Chat from './pages/Chat';

const ProtectedRoute = ({ children }) => {
  const { session } = useSession();
  if (!session) return <Navigate to="/" />;
  return children;
};

const App = () => {
  return (
    <SessionProvider>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </SocketProvider>
    </SessionProvider>
  );
};

export default App;
