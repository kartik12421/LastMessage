import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../context/SessionContext';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { useWebRTC } from '../hooks/useWebRTC';
import {
  LogOut,
  Send,
  Phone,
  Video,
  PhoneOff,
  Mic,
  MicOff,
  VideoOff,
  Users,
  MessageSquare,
  Copy,
} from 'lucide-react';

const Chat = () => {
  const { session, leaveSession } = useSession();
  const socket = useSocket();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState({});
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const me = session?.sessionId;
  const roomCode = session?.roomCode;

  const {
    localStream,
    remoteStream,
    callType,
    callStatus,
    incomingCall,
    startCall,
    acceptCall,
    declineCall,
    endCall,
  } = useWebRTC({ socket, roomCode });

  // Join the room socket room on connect
  useEffect(() => {
    if (socket && me && roomCode) {
      socket.emit('join_room', { roomCode, sessionId: me });
    }
  }, [socket, roomCode, me]);

  // Listen for messages and room events
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    const handleRoomHistory = (history) => {
      setMessages(history);
    };

    const handleRoomMembers = (members) => {
      setMembers(members);
    };

    const handleUserLeft = ({ sessionId }) => {
      setMembers((prev) => prev.filter((m) => m.sessionId !== sessionId));
    };

    const handleUserTyping = ({ senderId, isTyping }) => {
      setTypingUsers((prev) => ({ ...prev, [senderId]: isTyping }));
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('room_history', handleRoomHistory);
    socket.on('room_members', handleRoomMembers);
    socket.on('user_left', handleUserLeft);
    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('room_history', handleRoomHistory);
      socket.off('room_members', handleRoomMembers);
      socket.off('user_left', handleUserLeft);
      socket.off('user_typing', handleUserTyping);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !roomCode) return;
    socket.emit('send_message', { roomCode, content: newMessage });
    setNewMessage('');
    socket.emit('typing', { roomCode, isTyping: false });
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (socket && roomCode) {
      socket.emit('typing', { roomCode, isTyping: e.target.value.length > 0 });
    }
  };

  const handleLeave = async () => {
    endCall();
    await leaveSession();
    navigate('/');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => (track.enabled = !isMicMuted));
      setIsMicMuted((prev) => !prev);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => (track.enabled = !isCameraOff));
      setIsCameraOff((prev) => !prev);
    }
  };

  const otherMembers = members.filter((m) => m.sessionId !== me);

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare size={24} className="text-blue-500" />
            AnonChat
          </h1>
        </div>

        {/* Room code */}
        <div className="p-4 border-b border-gray-700">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Room Code</p>
          <div className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2">
            <span className="font-mono font-bold tracking-widest text-green-400">{roomCode}</span>
            <button onClick={handleCopyCode} className="text-gray-400 hover:text-white" title="Copy code">
              <Copy size={16} />
            </button>
          </div>
          {copied && <p className="text-xs text-green-400 mt-1">Copied!</p>}
        </div>

        {/* Members */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Members ({members.length})
          </p>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.sessionId} className="flex items-center gap-2 p-2 rounded-lg bg-gray-900">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm">
                  {m.username[0]?.toUpperCase()}
                </div>
                <span className="truncate text-sm">{m.username}{m.sessionId === me ? ' (you)' : ''}</span>
              </div>
            ))}
          </div>

          {typingUsers && Object.values(typingUsers).some(Boolean) && (
            <p className="text-xs text-gray-500 mt-4 italic">Someone is typing...</p>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center font-bold">
              {session?.username[0]?.toUpperCase()}
            </div>
            <span className="truncate text-sm font-medium">{session?.username}</span>
          </div>
          <button onClick={handleLeave} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-red-400" title="End session">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-16 border-b border-gray-700 flex items-center px-6 bg-gray-800 justify-between">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-gray-400" />
            <h2 className="font-bold text-lg leading-tight">Room {roomCode}</h2>
          </div>

          {/* Call buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => otherMembers[0] && startCall(otherMembers[0], 'voice')}
              disabled={otherMembers.length === 0}
              className={`p-2 rounded-full transition disabled:opacity-40 ${callStatus === 'in-call' && callType === 'voice' ? 'bg-green-600' : 'bg-gray-700 hover:bg-green-600'}`}
              title={otherMembers.length ? 'Voice call' : 'No other members online'}
            >
              <Phone size={18} />
            </button>
            <button
              onClick={() => otherMembers[0] && startCall(otherMembers[0], 'video')}
              disabled={otherMembers.length === 0}
              className={`p-2 rounded-full transition disabled:opacity-40 ${callStatus === 'in-call' && callType === 'video' ? 'bg-green-600' : 'bg-gray-700 hover:bg-purple-600'}`}
              title={otherMembers.length ? 'Video call' : 'No other members online'}
            >
              <Video size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-10">
              <MessageSquare className="mx-auto mb-2" size={40} />
              <p>No messages yet. Say hi!</p>
              <p className="text-xs mt-2">Your session is temporary — everything is erased when it ends.</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.senderId === me ? 'items-end' : 'items-start'}`}>
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-xs font-semibold ${msg.senderId === me ? 'text-green-400' : 'text-blue-400'}`}>
                  {msg.senderName}
                </span>
                <span className="text-[10px] text-gray-500">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={`max-w-md p-3 rounded-2xl ${
                msg.senderId === me ? 'bg-green-700 rounded-tr-none' : 'bg-gray-700 rounded-tl-none'
              }`}>
                <p className="text-sm break-words">{msg.content}</p>
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
              placeholder={`Message the room`}
              className="w-full bg-gray-700 text-white p-3 pr-12 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={newMessage}
              onChange={handleTyping}
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
      </div>

      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-sm w-full mx-4">
            <Phone className={`mx-auto mb-4 ${incomingCall.callType === 'video' ? 'text-purple-400' : 'text-green-400'}`} size={48} />
            <h3 className="text-2xl font-bold mb-2">{incomingCall.from.username}</h3>
            <p className="text-gray-400 mb-6">
              {incomingCall.callType === 'video' ? 'Incoming video call' : 'Incoming voice call'}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={declineCall}
                className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition"
                title="Decline"
              >
                <PhoneOff size={24} />
              </button>
              <button
                onClick={acceptCall}
                className="p-4 rounded-full bg-green-600 hover:bg-green-700 transition"
                title="Accept"
              >
                <Phone size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active / Calling Call UI */}
      {(callStatus === 'calling' || callStatus === 'in-call') && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
          {callType === 'video' ? (
            <div className="relative w-full h-full max-w-3xl max-h-[60vh] flex items-center justify-center">
              {remoteStream ? (
                <video
                  ref={(el) => { if (el) el.srcObject = remoteStream; }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain rounded-lg bg-gray-900"
                />
              ) : (
                <div className="text-center text-gray-400">
                  <Video className="mx-auto mb-2" size={48} />
                  <p>{callStatus === 'calling' ? 'Calling...' : 'Waiting for their video...'}</p>
                </div>
              )}
              {localStream && (
                <video
                  ref={(el) => { if (el) el.srcObject = localStream; }}
                  muted
                  autoPlay
                  playsInline
                  className="absolute bottom-4 right-4 w-40 h-28 object-cover rounded-lg border border-gray-600 bg-gray-900"
                />
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-green-600 flex items-center justify-center mx-auto mb-6">
                <Phone size={40} />
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {callStatus === 'calling' ? 'Calling...' : otherMembers[0]?.username || 'In call'}
              </h3>
              <p className="text-gray-400 mb-8">{callStatus === 'calling' ? 'Ringing...' : 'Voice call connected'}</p>
              {localStream && <audio autoPlay muted ref={(el) => { if (el) el.srcObject = localStream; }} />}
              {remoteStream && <audio autoPlay ref={(el) => { if (el) el.srcObject = remoteStream; }} />}
            </div>
          )}

          {/* Controls */}
          {(callStatus === 'calling' || callStatus === 'in-call') && (
            <div className="absolute bottom-10 flex items-center gap-4">
              {callType === 'video' && localStream && (
                <button
                  onClick={toggleCamera}
                  className={`p-4 rounded-full transition ${isCameraOff ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  title={isCameraOff ? 'Unmute camera' : 'Mute camera'}
                >
                  {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
                </button>
              )}
              <button
                onClick={toggleMic}
                className={`p-4 rounded-full transition ${isMicMuted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                title={isMicMuted ? 'Unmute mic' : 'Mute mic'}
              >
                {isMicMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>
              <button
                onClick={endCall}
                className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition"
                title="End call"
              >
                <PhoneOff size={22} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Ended call indicator */}
      {callStatus === 'ended' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-full px-6 py-3 text-sm z-50">
          Call ended
        </div>
      )}
    </div>
  );
};

export default Chat;
