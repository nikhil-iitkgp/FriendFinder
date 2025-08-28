'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Send, X } from 'lucide-react';

interface VoiceRecorderProps {
  onSendVoiceMessage: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onSendVoiceMessage, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onSendVoiceMessage(audioBlob, duration);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
      {!isRecording && !audioBlob && (
        <button
          onClick={startRecording}
          className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
        >
          <Mic className="w-5 h-5" />
        </button>
      )}

      {isRecording && (
        <>
          <button
            onClick={stopRecording}
            className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors animate-pulse"
          >
            <MicOff className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-mono text-gray-700">
              {formatDuration(duration)}
            </span>
          </div>
        </>
      )}

      {audioBlob && !isRecording && (
        <>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Mic className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-gray-700">
              Voice message ({formatDuration(duration)})
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSend}
              className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              onClick={onCancel}
              className="p-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
