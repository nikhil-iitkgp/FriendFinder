"use client";

import { useState, useRef, useEffect } from "react";
import { useRandomChat } from "@/context/RandomChatContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Send, 
  Smile, 
  Image, 
  Mic, 
  Video, 
  MicOff, 
  VideoOff,
  Loader2,
} from "lucide-react";
import type { RandomChatSession, RandomChatMessage } from "@/context/RandomChatContext";

interface ChatInterfaceProps {
  session: RandomChatSession;
}

export default function ChatInterface({ session }: ChatInterfaceProps) {
  const {
    messages,
    isTyping,
    partnerTyping,
    sendMessage,
    startTyping,
    stopTyping,
  } = useRandomChat();

  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show warning for voice/video chats that fallback to text
  const isVoiceOrVideo = session.chatType === 'voice' || session.chatType === 'video';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partnerTyping]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!content || isSending) return;

    setIsSending(true);
    setMessageInput("");
    stopTyping();

    const result = await sendMessage(content);
    
    if (!result.success) {
      // Restore message if failed
      setMessageInput(content);
    }
    
    setIsSending(false);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    
    // Handle typing indicators
    if (!isTyping) {
      startTyping();
    }
    
    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const MessageBubble = ({ message }: { message: RandomChatMessage }) => {
    const isOwn = message.isOwn;
    
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3 sm:mb-4`}>
        <div className={`flex gap-2 max-w-[85%] sm:max-w-[70%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isOwn && (
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="text-xs">
                {message.anonymousId.charAt(0)}
              </AvatarFallback>
            </Avatar>
          )}
          
          <div className={`space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
            <div
              className={`
                px-3 py-2 rounded-2xl max-w-full break-words text-sm sm:text-base
                ${isOwn 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
                }
              `}
            >
              {message.type === 'system' ? (
                <em className="text-sm">{message.content}</em>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {!isOwn && (
                <span className="font-medium">{message.anonymousId}</span>
              )}
              <span>{formatMessageTime(message.timestamp)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TypingIndicator = () => (
    <div className="flex justify-start mb-4">
      <div className="flex gap-2 max-w-[70%]">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs">
            {session.partner.anonymousId.charAt(0)}
          </AvatarFallback>
        </Avatar>
        
        <div className="bg-muted px-3 py-2 rounded-2xl">
          <div className="flex items-center gap-1">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-xs text-muted-foreground ml-2">typing...</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="h-[600px] sm:h-[700px] flex flex-col">
      {/* Chat Header */}
      <CardHeader className="pb-3">
        {/* Voice/Video Chat Notice */}
        {isVoiceOrVideo && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              {session.chatType === 'video' ? <Video className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              <span className="text-sm font-medium">
                {session.chatType === 'video' ? 'Video' : 'Voice'} chat is also available!
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              This text chat works alongside your {session.chatType} call.
            </p>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {session.partner.anonymousId.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{session.partner.anonymousId}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={session.partner.isActive ? "default" : "secondary"} className="text-xs">
                  {session.partner.isActive ? "Online" : "Offline"}
                </Badge>
                <Badge variant="outline" className="text-xs capitalize">
                  {session.chatType}
                </Badge>
              </div>
            </div>
          </div>
          
          {/* Call Controls (for voice/video) */}
          {(session.chatType === 'voice' || session.chatType === 'video') && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Mic className="h-4 w-4" />
              </Button>
              {session.chatType === 'video' && (
                <Button size="sm" variant="outline">
                  <Video className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-4">
          <div className="py-4">
            {/* Welcome Message */}
            <div className="text-center mb-6">
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p>🎉 You're now chatting with <strong>{session.partner.anonymousId}</strong></p>
                <p className="text-xs mt-1">Be respectful and have fun! You can report inappropriate behavior anytime.</p>
              </div>
            </div>

            {/* Messages */}
            {messages.map((message) => (
              <MessageBubble key={message.messageId} message={message} />
            ))}

            {/* Typing Indicator */}
            {partnerTyping && <TypingIndicator />}

            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={messageInput}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={isSending || !session.partner.isActive}
              className="pr-20"
              maxLength={1000}
            />
            
            {/* Character count */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
              {messageInput.length}/1000
            </div>
          </div>
          
          {/* Send Button */}
          <Button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || isSending || !session.partner.isActive}
            size="sm"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Status indicators */}
        <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
          <div>
            {isTyping && <span>You are typing...</span>}
            {!session.partner.isActive && (
              <span className="text-orange-600">Partner is offline</span>
            )}
          </div>
          
          <div>
            Messages: {session.messagesCount}
          </div>
        </div>
      </div>
    </Card>
  );
}