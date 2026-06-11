import React, { useState, useEffect, useRef } from 'react';
import { PhoneCall, PhoneIncoming, PhoneMissed, Video, Phone, PhoneOff, Mic, MicOff, VideoOff, CameraIcon } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function CallScreen({ callId, callType, callState, peer, onEnd }) {
  const { user } = useAuth();
  const { emit, on } = useSocket() || {};
  const [muted, setMuted]     = useState(false);
  const [camOff, setCamOff]   = useState(false);
  const [duration, setDuration] = useState(0);
  const [status, setStatus]   = useState(callState); // incoming | outgoing | active | ended
  const localRef    = useRef(null);
  const remoteRef   = useRef(null);
  const peerConnRef = useRef(null);
  const streamRef   = useRef(null);
  const timerRef    = useRef(null);

  // Start timer when active
  useEffect(() => {
    if (status === 'active') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  // WebRTC setup
  useEffect(() => {
    const initWebRTC = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video',
        });
        streamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        });
        peerConnRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (e) => {
          if (remoteRef.current) remoteRef.current.srcObject = e.streams[0];
          setStatus('active');
        };

        pc.onicecandidate = (e) => {
          if (e.candidate && peer?.id) {
            emit?.('call_ice_candidate', { targetUserId: peer.id, candidate: e.candidate, callId });
          }
        };

        // Caller creates offer
        if (callState === 'outgoing') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          emit?.('call_signal', { targetUserId: peer?.id, signal: offer, callId, type: callType });
        }
      } catch (e) {
        console.error('WebRTC init error:', e);
      }
    };

    initWebRTC();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      peerConnRef.current?.close();
    };
  }, []);

  // Handle incoming signals
  useEffect(() => {
    if (!on) return;
    const c1 = on('call_signal', async ({ signal, fromUserId }) => {
      if (!peerConnRef.current) return;
      const pc = peerConnRef.current;
      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emit?.('call_accept', { callId, targetUserId: fromUserId, signal: answer });
        setStatus('active');
      }
    });
    const c2 = on('call_accepted', async ({ signal }) => {
      if (!peerConnRef.current) return;
      await peerConnRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      setStatus('active');
    });
    const c3 = on('call_ice_candidate', async ({ candidate }) => {
      try { await peerConnRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });
    const c4 = on('call_rejected', () => { setStatus('ended'); setTimeout(onEnd, 2000); });
    const c5 = on('call_ended', () => { setStatus('ended'); setTimeout(onEnd, 1500); });
    return () => { c1?.(); c2?.(); c3?.(); c4?.(); c5?.(); };
  }, [on, emit, callId, onEnd]);

  const accept = async () => {
    setStatus('active');
    // Signal handled by WebRTC useEffect
  };

  const reject = () => {
    emit?.('call_reject', { callId, targetUserId: peer?.id });
    streamRef.current?.getTracks().forEach(t => t.stop());
    onEnd?.();
  };

  const endCall = () => {
    emit?.('call_end', { callId, targetUserId: peer?.id, duration });
    api.patch(`/calls/${callId}`, { status: 'ended', duration }).catch(() => {});
    streamRef.current?.getTracks().forEach(t => t.stop());
    setStatus('ended');
    setTimeout(onEnd, 1000);
  };

  const toggleMute = () => {
    setMuted(m => {
      streamRef.current?.getAudioTracks().forEach(t => t.enabled = m);
      return !m;
    });
  };

  const toggleCam = () => {
    setCamOff(c => {
      streamRef.current?.getVideoTracks().forEach(t => t.enabled = c);
      return !c;
    });
  };

  const formatDuration = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-cw-bg flex flex-col items-center justify-between py-12">
      {/* Remote video (background) */}
      {callType === 'video' && (
        <video ref={remoteRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover opacity-80" />
      )}

      {/* Local video (PiP) */}
      {callType === 'video' && (
        <video ref={localRef} autoPlay playsInline muted className="absolute top-4 right-4 w-32 h-44 rounded-xl object-cover border-2 border-white/30 z-10" />
      )}

      {/* Audio (hidden) */}
      {callType === 'voice' && <audio ref={remoteRef} autoPlay />}

      {/* Top info */}
      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <div className={`rounded-full overflow-hidden ${status === 'active' ? '' : 'call-ring'}`}>
          <Avatar src={peer?.avatar} name={peer?.name} size={100} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{peer?.name || 'Unknown'}</h2>
          <p className="text-cw-text-muted mt-1">
            {status === 'incoming' ? `Incoming ${callType} call…` :
             status === 'outgoing' ? `Calling…` :
             status === 'active'   ? formatDuration(duration) :
             'Call ended'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 w-full px-8">
        {status === 'incoming' ? (
          <div className="flex justify-around">
            <button onClick={reject} className="w-16 h-16 bg-cw-red rounded-full flex items-center justify-center call-ring">
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
            <button onClick={accept} className="w-16 h-16 bg-cw-primary rounded-full flex items-center justify-center call-ring">
              {callType === 'video' ? <Video className="w-7 h-7 text-white" /> : <Phone className="w-7 h-7 text-white" />}
            </button>
          </div>
        ) : (
          <div className="flex justify-around">
            <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center ${muted ? 'bg-white/30' : 'bg-white/10'}`}>
              {muted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
            </button>
            {callType === 'video' && (
              <button onClick={toggleCam} className={`w-14 h-14 rounded-full flex items-center justify-center ${camOff ? 'bg-white/30' : 'bg-white/10'}`}>
                {camOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
              </button>
            )}
            <button onClick={endCall} className="w-16 h-16 bg-cw-red rounded-full flex items-center justify-center">
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
