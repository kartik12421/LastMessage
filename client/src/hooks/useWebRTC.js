import { useState, useRef, useEffect, useCallback } from 'react';

const WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useWebRTC = ({ socket, roomCode }) => {
  const [callType, setCallType] = useState(null); // 'voice' | 'video' | null
  const [callStatus, setCallStatus] = useState('idle'); // 'idle' | 'calling' | 'ringing' | 'in-call' | 'ended'
  const [incomingCall, setIncomingCall] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const callPartnerRef = useRef(null);

  // Cleanup local stream + peer connection
  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
      remoteStreamRef.current = null;
    }
    setRemoteStream(null);
    callPartnerRef.current = null;
    setIncomingCall(null);
  }, []);

  const endCall = useCallback(() => {
    if (socket && callPartnerRef.current) {
      socket.emit('end_call', {
        roomCode,
        toSessionId: callPartnerRef.current.sessionId,
      });
    }
    cleanup();
    setCallStatus('ended');
    setCallType(null);
  }, [socket, roomCode, cleanup]);

  // Handle incoming end_call
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      cleanup();
      setCallStatus('ended');
      setCallType(null);
    };
    socket.on('end_call', handler);
    return () => socket.off('end_call', handler);
  }, [socket, cleanup]);

  const createPeerConnection = useCallback((stream) => {
    const pc = new RTCPeerConnection(WEBRTC_CONFIG);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    const remote = new MediaStream();
    remoteStreamRef.current = remote;
    setRemoteStream(remote);

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remote.addTrack(track);
      });
      setRemoteStream(remote);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && callPartnerRef.current) {
        socket.emit('ice_candidate', {
          roomCode,
          toSessionId: callPartnerRef.current.sessionId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        endCall();
      }
    };

    return pc;
  }, [socket, roomCode, endCall]);

  const getMedia = async (video) => {
    return navigator.mediaDevices.getUserMedia({
      video: video ? { width: 1280, height: 720 } : false,
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  };

  // Start a call (outgoing)
  const startCall = useCallback(async (partner, type) => {
    if (!socket || !partner) return;
    try {
      const stream = await getMedia(type === 'video');
      localStreamRef.current = stream;
      setLocalStream(stream);
      callPartnerRef.current = partner;
      setCallType(type);
      setCallStatus('calling');

      const pc = createPeerConnection(stream);
      pcRef.current = pc;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('call_user', {
        roomCode,
        toSessionId: partner.sessionId,
        offer,
        callType: type,
      });
    } catch (error) {
      console.error('startCall error:', error);
      cleanup();
      setCallStatus('idle');
    }
  }, [socket, roomCode, createPeerConnection, cleanup]);

  // Accept an incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    try {
      const stream = await getMedia(incomingCall.callType === 'video');
      localStreamRef.current = stream;
      setLocalStream(stream);
      callPartnerRef.current = { sessionId: incomingCall.from.sessionId };
      setCallType(incomingCall.callType);
      setCallStatus('in-call');

      const pc = createPeerConnection(stream);
      pcRef.current = pc;

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call_accepted', {
        roomCode,
        toSessionId: incomingCall.from.sessionId,
        answer,
      });

      setIncomingCall(null);
    } catch (error) {
      console.error('acceptCall error:', error);
      cleanup();
      setCallStatus('idle');
    }
  }, [incomingCall, socket, roomCode, createPeerConnection, cleanup]);

  // Decline an incoming call
  const declineCall = useCallback(() => {
    if (incomingCall) {
      socket.emit('end_call', {
        roomCode,
        toSessionId: incomingCall.from.sessionId,
      });
    }
    cleanup();
    setCallStatus('idle');
    setCallType(null);
  }, [incomingCall, socket, roomCode, cleanup]);

  // Listen for signaling events
  useEffect(() => {
    if (!socket) return;

    const handleIncomingCall = (data) => {
      setIncomingCall(data);
      setCallStatus('ringing');
    };

    const handleCallAccepted = async (data) => {
      const pc = pcRef.current;
      if (pc && callStatus === 'calling') {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        setCallStatus('in-call');
      }
    };

    const handleIceCandidate = async (data) => {
      const pc = pcRef.current;
      if (pc && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (error) {
          console.error('addIceCandidate error:', error);
        }
      }
    };

    socket.on('incoming_call', handleIncomingCall);
    socket.on('call_accepted', handleCallAccepted);
    socket.on('ice_candidate', handleIceCandidate);

    return () => {
      socket.off('incoming_call', handleIncomingCall);
      socket.off('call_accepted', handleCallAccepted);
      socket.off('ice_candidate', handleIceCandidate);
    };
  }, [socket, callStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    localStream,
    remoteStream,
    callType,
    callStatus,
    incomingCall,
    startCall,
    acceptCall,
    declineCall,
    endCall,
  };
};
