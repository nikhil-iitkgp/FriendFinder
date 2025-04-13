import React, { useEffect, useState, useContext, useRef } from "react";
import { api } from "../api/api";
import AuthContext from "../context/AuthContext";
import { io } from "socket.io-client";
import Picker from "emoji-picker-react";
import Peer from "simple-peer";
import {
  Box, Card, Typography, TextField, Button, List, ListItem, ListItemText,
  Paper, CircularProgress, IconButton, Avatar
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import VideocamIcon from "@mui/icons-material/Videocam";
import CallIcon from "@mui/icons-material/Call";
import InsertEmoticonIcon from "@mui/icons-material/InsertEmoticon";

const socket = io(process.env.REACT_APP_API_URL, { transports: ["websocket"] });

function Chat() {
  const { user } = useContext(AuthContext);
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    fetchFriends();

    socket.on(`receiveMessage-${user.id}`, (msg) => {
      if (selectedFriend && msg.senderId === selectedFriend._id) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      socket.off(`receiveMessage-${user.id}`);
    };
  }, [selectedFriend]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchFriends = async () => {
    try {
      const res = await api.get("/api/profile");
      setFriends(res.data.friends);
    } catch (err) {
      console.error("Error fetching friends", err);
    }
  };

  const fetchMessages = async (friendId) => {
    try {
      const res = await api.get(`/api/messages/${friendId}`);
      setMessages(res.data);
      setSelectedFriend(friends.find((f) => f._id === friendId));
    } catch (err) {
      console.error("Error fetching messages", err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageData = {
      receiverId: selectedFriend._id,
      message: newMessage,
      timestamp: new Date().toISOString()
    };

    try {
      await api.post("/api/messages", messageData);
      socket.emit("sendMessage", {
        senderId: user.id,
        receiverId: selectedFriend._id,
        message: newMessage
      });

      setMessages((prev) => [...prev, {
        sender: user.id,
        message: newMessage,
        timestamp: new Date().toISOString()
      }]);
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message", err);
    }
  };

  const handleEmojiClick = (event, emojiObject) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
  };

  const startVoiceCall = () => {
    alert("Voice call feature coming soon! 🎙️");
  };

  const startVideoCall = () => {
    alert("Video call feature coming soon! 🎥");
  };

  return (
    <Box sx={{ display: "flex", height: "80vh", p: 2, gap: 2 }}>
      {/* Friends List */}
      <Card sx={{ width: "25%", p: 2, overflowY: "auto", bgcolor: "#f0f2f5" }}>
        <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>Chats</Typography>
        <List>
          {friends.length === 0 ? <CircularProgress size={24} /> :
            friends.map((friend) => (
              <ListItem
                key={friend._id}
                button
                sx={{
                  mb: 1,
                  bgcolor: selectedFriend?._id === friend._id ? "#d1e7ff" : "white",
                  borderRadius: "10px"
                }}
                onClick={() => fetchMessages(friend._id)}
              >
                <Avatar>{friend.name.charAt(0)}</Avatar>
                <ListItemText primary={friend.name} sx={{ ml: 2 }} />
              </ListItem>
            ))}
        </List>
      </Card>

      {/* Chat Section */}
      <Card sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2, bgcolor: "#ffffff" }}>
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <Box sx={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              mb: 2, p: 1, bgcolor: "#d1e7ff", borderRadius: "10px"
            }}>
              <Typography variant="h6">{selectedFriend.name}</Typography>
              <Box>
                <IconButton sx={{ mr: 1 }} onClick={startVoiceCall}><CallIcon /></IconButton>
                <IconButton onClick={startVideoCall}><VideocamIcon /></IconButton>
              </Box>
            </Box>

            {/* Messages */}
            <Paper ref={chatBoxRef} sx={{
              flex: 1, overflowY: "auto", p: 2, bgcolor: "#f0f2f5", borderRadius: "10px"
            }}>
              {messages.map((msg, index) => (
                <Box key={index} sx={{
                  display: "flex", flexDirection: msg.sender === user.id ? "row-reverse" : "row", mb: 1
                }}>
                  <Box sx={{
                    maxWidth: "70%", p: 1.5, borderRadius: "10px",
                    bgcolor: msg.sender === user.id ? "#d1e7ff" : "white"
                  }}>
                    <Typography variant="body2">{msg.message}</Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ display: "block", textAlign: "right" }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Paper>

            {/* Message Input */}
            <Box sx={{ display: "flex", alignItems: "center", mt: 2, p: 1, bgcolor: "#ffffff", borderRadius: "10px" }}>
              <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                <InsertEmoticonIcon />
              </IconButton>
              {showEmojiPicker && <Picker onEmojiClick={handleEmojiClick} />}
              <TextField
                fullWidth variant="outlined" size="small"
                value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..." sx={{ mr: 1 }}
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()} variant="contained" sx={{ bgcolor: "#25D366" }}>
                <SendIcon />
              </Button>
            </Box>
          </>
        ) : (
          <Typography variant="h6" sx={{ textAlign: "center", mt: "20%" }}>Select a friend to start chatting</Typography>
        )}
      </Card>
    </Box>
  );
}

export default Chat;
