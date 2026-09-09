import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { useNavigate, Link } from 'react-router-dom';
import { Users, MessageSquare, Mic, Video } from 'lucide-react';

const Home = () => {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [autoJoin, setAutoJoin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { createSession, joinSession, session } = useSession();
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a display name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await createSession(username);
      if (autoJoin) {
        navigate('/chat', { state: { roomCode: data.roomCode } });
      } else {
        setRoomCode(data.roomCode);
        setAutoJoin(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !roomCode.trim()) {
      setError('Please enter a display name and room code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await joinSession(username, roomCode);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3 flex items-center justify-center gap-2">
            <MessageSquare className="text-blue-500" size={36} />
            <span>Anonymous Chat</span>
          </h1>
          <p className="text-gray-400">
            Chat, voice call & video call anonymously. <span className="text-gray-500">Nothing is saved — once the session ends, everything is erased.</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Create Session */}
          <form onSubmit={handleCreate} className="bg-gray-800 rounded-2xl p-6 space-y-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Users className="text-green-500" size={20} />
              <h2 className="text-xl font-bold">Create a Session</h2>
            </div>
            <p className="text-sm text-gray-400">Start a new anonymous room and get a code to share.</p>
            <input
              type="text"
              placeholder="Your display name"
              className="w-full p-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {autoJoin && session ? (
              <div className="bg-gray-900 border border-green-500/50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-300 mb-2">Your room code:</p>
                <p className="text-3xl font-mono font-bold tracking-widest text-green-400">{session.roomCode}</p>
                <p className="text-xs text-gray-500 mt-2">Share this code so others can join</p>
                <button
                  type="button"
                  onClick={() => navigate('/chat')}
                  className="mt-4 w-full bg-green-600 hover:bg-green-700 font-bold py-3 rounded-lg transition"
                >
                  Enter Room
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 font-bold py-3 rounded-lg transition disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Session'}
              </button>
            )}
          </form>

          {/* Join Session */}
          <form onSubmit={handleJoin} className="bg-gray-800 rounded-2xl p-6 space-y-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="text-blue-500" size={20} />
              <h2 className="text-xl font-bold">Join a Session</h2>
            </div>
            <p className="text-sm text-gray-400">Enter the 6-character code shared with you.</p>
            <input
              type="text"
              placeholder="Your display name"
              className="w-full p-3 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="text"
              placeholder="Room code (e.g. ABC123)"
              className="w-full p-3 bg-gray-700 text-white rounded-lg uppercase font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              maxLength={6}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Session'}
            </button>
          </form>
        </div>

        {error && <p className="text-red-500 text-center mt-6">{error}</p>}

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <MessageSquare className="mx-auto text-blue-400 mb-2" size={28} />
            <p className="text-sm font-semibold">Text Chat</p>
            <p className="text-xs text-gray-500 mt-1">Real-time anonymous messages</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <Mic className="mx-auto text-green-400 mb-2" size={28} />
            <p className="text-sm font-semibold">Voice Calls</p>
            <p className="text-xs text-gray-500 mt-1">Peer-to-peer audio</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <Video className="mx-auto text-purple-400 mb-2" size={28} />
            <p className="text-sm font-semibold">Video Calls</p>
            <p className="text-xs text-gray-500 mt-1">Peer-to-peer video</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
