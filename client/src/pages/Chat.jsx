import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { LogOut, Send, Hash, MessageSquare } from 'lucide-react';

const Chat = () => {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const [communities, setCommunities] = useState([]);
  const [currentCommunity, setCurrentCommunity] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const API_BASE = 'http://localhost:5000/api';

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/communities`, { withCredentials: true });
        setCommunities(data);
        if (data.length > 0) setCurrentCommunity(data[0]);
      } catch (err) {
        console.error('Failed to fetch communities');
      }
    };
    fetchCommunities();
  }, []);

  useEffect(() => {
    if (currentCommunity) {
      const fetchMessages = async () => {
        try {
          const { data } = await axios.get(`${API_BASE}/messages/${currentCommunity._id}`, { withCredentials: true });
          setMessages(data);
        } catch (err) {
          console.error('Failed to fetch messages');
        }
      };
      fetchMessages();

      if (socket) {
        socket.emit('join_room', currentCommunity._id);
      }
    }
  }, [currentCommunity, socket]);

  useEffect(() => {
    if (socket) {
      const handleReceiveMessage = (message) => {
        if (message.communityId === currentCommunity?._id) {
          setMessages((prev) => [...prev, message]);
        }
      };

      socket.on('receive_message', handleReceiveMessage);
      return () => socket.off('receive_message', handleReceiveMessage);
    }
  }, [socket, currentCommunity]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !currentCommunity) return;

    const messageData = {
      senderId: user._id,
      senderName: user.username,
      communityId: currentCommunity._id,
      content: newMessage
    };

    socket.emit('send_message', messageData);
    setNewMessage('');
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Sidebar - Communities */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare size={24} className="text-blue-500" />
            ChatRoom
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Communities</p>
          {communities.map((community) => (
            <button
              key={community._id}
              onClick={() => setCurrentCommunity(community)}
              className={`w-full flex items-center gap-2 p-3 rounded-lg transition-colors ${
                currentCommunity?._id === community._id ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'
              }`}
            >
              <Hash size={18} />
              <span className="truncate">{community.name}</span>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">
              {user.username[0].toUpperCase()}
            </div>
            <span className="truncate text-sm font-medium">{user.username}</span>
          </div>
          <button onClick={logout} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentCommunity ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-gray-700 flex items-center px-6 bg-gray-800">
              <Hash size={20} className="text-gray-400 mr-2" />
              <div>
                <h2 className="font-bold text-lg leading-tight">{currentCommunity.name}</h2>
                <p className="text-xs text-gray-400">{currentCommunity.description}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, index) => (
                <div key={msg._id || index} className={`flex flex-col ${msg.senderId === user._id ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-semibold text-blue-400">{msg.senderName}</span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={`max-w-md p-3 rounded-2xl ${
                    msg.senderId === user._id ? 'bg-blue-600 rounded-tr-none' : 'bg-gray-700 rounded-tl-none'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 bg-gray-800 border-t border-gray-700">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder={`Message #${currentCommunity.name}`}
                  className="w-full bg-gray-700 text-white p-3 pr-12 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-2 p-2 text-blue-500 hover:text-blue-400 disabled:opacity-50 transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p>Select a community to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
