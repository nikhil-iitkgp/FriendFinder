"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Mic, 
  Video, 
  Plus, 
  X,
  Loader2,
} from "lucide-react";
import type { ChatPreferences } from "@/context/RandomChatContext";

interface PreferencesSelectorProps {
  onJoinQueue: (preferences: ChatPreferences) => void;
  isLoading: boolean;
  disabled: boolean;
}

export default function PreferencesSelector({ 
  onJoinQueue, 
  isLoading, 
  disabled 
}: PreferencesSelectorProps) {
  const [chatType, setChatType] = useState<'text' | 'voice' | 'video'>('text');
  const [language, setLanguage] = useState('en');
  const [interests, setInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState('');
  const [ageRange, setAgeRange] = useState({ min: 18, max: 65 });

  const chatTypes = [
    { value: 'text', label: 'Text Chat', icon: MessageCircle, description: 'Chat using text messages (Recommended for testing)' },
    { value: 'voice', label: 'Voice Call', icon: Mic, description: 'Talk using voice (Requires microphone)' },
    { value: 'video', label: 'Video Call', icon: Video, description: 'Video chat face-to-face (Requires camera & microphone)' },
  ] as const;

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'ru', label: 'Russian' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'zh', label: 'Chinese' },
  ];

  const popularInterests = [
    'Technology', 'Music', 'Movies', 'Games', 'Sports', 'Travel', 
    'Books', 'Art', 'Food', 'Fashion', 'Science', 'Photography'
  ];

  const addInterest = (interest: string) => {
    const trimmed = interest.trim();
    if (trimmed && !interests.includes(trimmed) && interests.length < 5) {
      setInterests([...interests, trimmed]);
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  const handleSubmit = () => {
    const preferences: ChatPreferences = {
      chatType,
      language: language || undefined,
      interests: interests.length > 0 ? interests : undefined,
      ageRange: ageRange.min !== 18 || ageRange.max !== 65 ? ageRange : undefined,
    };

    onJoinQueue(preferences);
  };

  return (
    <div className="space-y-6">
      {/* Chat Type Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Chat Type</Label>
        <div className="grid grid-cols-1 gap-2">
          {chatTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setChatType(type.value)}
                disabled={disabled}
                className={`
                  p-3 rounded-lg border-2 text-left transition-colors
                  ${chatType === type.value 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5" />
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-sm text-muted-foreground">{type.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Language Preference */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Preferred Language (Optional)</Label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={disabled}
          aria-label="Select preferred language"
          className="w-full p-2 border border-border rounded-md bg-background"
        >
          {languages.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Interests */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Interests (Optional, max 5)</Label>
        
        {/* Current interests */}
        {interests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <Badge key={interest} variant="secondary" className="gap-1">
                {interest}
                <button
                  onClick={() => removeInterest(interest)}
                  disabled={disabled}
                  className="hover:bg-destructive hover:text-destructive-foreground rounded-full"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Add new interest */}
        {interests.length < 5 && (
          <div className="flex gap-2">
            <Input
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addInterest(newInterest);
                }
              }}
              placeholder="Add an interest..."
              disabled={disabled}
              className="flex-1"
            />
            <Button
              onClick={() => addInterest(newInterest)}
              disabled={disabled || !newInterest.trim()}
              size="sm"
              variant="outline"
              aria-label="Add interest"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Popular interests */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Popular interests:</div>
          <div className="flex flex-wrap gap-1">
            {popularInterests
              .filter(interest => !interests.includes(interest))
              .slice(0, 6)
              .map((interest) => (
                <button
                  key={interest}
                  onClick={() => addInterest(interest)}
                  disabled={disabled || interests.length >= 5}
                  aria-label={`Add ${interest} as interest`}
                  className="text-xs px-2 py-1 bg-muted hover:bg-muted/80 rounded-md transition-colors disabled:opacity-50"
                >
                  {interest}
                </button>
              ))
            }
          </div>
        </div>
      </div>

      {/* Age Range */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Age Range (Optional)</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Min Age</Label>
            <Input
              type="number"
              value={ageRange.min}
              onChange={(e) => setAgeRange(prev => ({ 
                ...prev, 
                min: Math.max(13, Math.min(100, parseInt(e.target.value) || 18))
              }))}
              min={13}
              max={100}
              disabled={disabled}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Max Age</Label>
            <Input
              type="number"
              value={ageRange.max}
              onChange={(e) => setAgeRange(prev => ({ 
                ...prev, 
                max: Math.max(13, Math.min(100, parseInt(e.target.value) || 65))
              }))}
              min={13}
              max={100}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Join Queue Button */}
      <Button
        onClick={handleSubmit}
        disabled={disabled || isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {isLoading ? 'Joining Queue...' : 'Start Random Chat'}
      </Button>

      {/* Development Testing Notice */}
      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="flex items-start gap-2">
          <div className="text-amber-600 dark:text-amber-400 mt-0.5">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="text-xs text-amber-700 dark:text-amber-300">
            <p className="font-medium mb-1">Development Testing Recommendation</p>
            <p>
              For testing during development, use <strong>Text Chat</strong> as it doesn't require camera/microphone permissions 
              and works reliably across multiple browser instances.
            </p>
          </div>
        </div>
      </div>

      {/* Camera/Microphone Permission Notice */}
      {(chatType === 'voice' || chatType === 'video') && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="text-blue-600 dark:text-blue-400 mt-0.5">
              {chatType === 'video' ? <Video className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">
                {chatType === 'video' ? 'Camera & Microphone' : 'Microphone'} Access Required
              </p>
              <p>
                Your browser will ask for permission to access your {chatType === 'video' ? 'camera and microphone' : 'microphone'}. 
                Please click "Allow" to enable {chatType} chat functionality.
              </p>
              <p className="mt-2 text-amber-600 dark:text-amber-400">
                <strong>Note:</strong> Multiple browsers on the same machine may conflict when accessing the same camera/microphone.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-xs text-muted-foreground space-y-1">
        <p>By starting a random chat, you agree to:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>Be respectful and follow community guidelines</li>
          <li>Not share personal information</li>
          <li>Report inappropriate behavior</li>
          <li>Understand that conversations are not permanently stored</li>
        </ul>
      </div>
    </div>
  );
}