import React, { useEffect, useState, useContext } from "react";
import { api } from "../api/api";
import AuthContext from "../context/AuthContext";
import {
  Card,
  CardContent,
  Typography,
  Grid2 as Grid,
  TextField,
  Button,
  Avatar,
  Box,
  Paper,
  IconButton,
  Container,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import io from "socket.io-client";

const socket = io("http://localhost:7000");

function Friends() {
  const { user } = useContext(AuthContext);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
    fetchUsers();

    socket.on("onlineUsers", (onlineUsersList) => {
      setOnlineUsers(new Set(onlineUsersList));
    });

    socket.on("friendListUpdated", fetchFriends);

    return () => {
      socket.off("onlineUsers");
      socket.off("friendListUpdated");
    };
  }, []);

  const fetchFriends = async () => {
    try {
      const res = await api.get("/api/profile");
      console.log("Fetched Friends:", res.data.friends);
      setFriends(res.data.friends || []);
    } catch (err) {
      console.error("Error fetching friends", err);
      setFriends([]);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const res = await api.get("/api/profile");
      console.log("Fetched Friend Requests:", res.data.friendRequests);
      setFriendRequests(res.data.friendRequests || []);
    } catch (err) {
      console.error("Error fetching friend requests", err);
      setFriendRequests([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/search?query=");
      console.log("Fetched Users:", res.data);
      setUsers(res.data || []);
    } catch (err) {
      console.error("Error fetching users", err);
      setUsers([]);
    }
  };

  const handleSearch = async () => {
    try {
      const res = await api.get(`/api/search?query=${searchQuery}`);
      setUsers(res.data || []);
    } catch (err) {
      console.error("Error searching users", err);
      setUsers([]);
    }
  };

  const sendFriendRequest = async (id) => {
    try {
      await api.post(`/api/send-friend-request/${id}`);
      alert("Friend request sent!");
      fetchUsers();
    } catch (err) {
      alert("Error sending friend request");
    }
  };

  const acceptFriendRequest = async (id) => {
    try {
      await api.post(`/api/accept-friend-request/${id}`);
      alert("Friend request accepted!");
      fetchFriends();
      fetchFriendRequests();
      socket.emit("friendListUpdated", user?._id);
    } catch (err) {
      alert("Error accepting friend request");
    }
  };

  const unfriendUser = async (id) => {
    if (window.confirm("Are you sure you want to unfriend this user?")) {
      try {
        await api.delete(`/api/unfriend/${id}`);
        alert("User has been unfriended.");
        fetchFriends();
        socket.emit("friendListUpdated", user?._id);
      } catch (err) {
        alert("Error unfriending user.");
      }
    }
  };

  return (
    <Container maxWidth="md" sx={{ paddingTop: 4, paddingBottom: 4 }}>
      <Typography
        variant="h4"
        align="center"
        sx={{ fontWeight: "bold", color: "#1976d2", marginBottom: 3 }}
      >
        Friends
      </Typography>

      {/* Friend Requests */}
      <Paper
        elevation={3}
        sx={{ padding: 3, borderRadius: 3, marginBottom: 3 }}
      >
        <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
          Friend Requests
        </Typography>
        {friendRequests?.length > 0 ? (
          friendRequests.map((req) => (
            <Card
              key={req?._id}
              sx={{
                display: "flex",
                alignItems: "center",
                padding: 2,
                marginBottom: 2,
              }}
            >
              <Avatar src={req?.profilePicture || ""} sx={{ marginRight: 2 }}>
                {!req?.profilePicture && (req?.name?.charAt(0) || "?")}
              </Avatar>
              <Typography variant="body1">
                {req?.name || "Unknown User"}
              </Typography>
              <IconButton
                onClick={() => acceptFriendRequest(req?._id)}
                color="primary"
              >
                <CheckIcon />
              </IconButton>
              <IconButton color="error">
                <CloseIcon />
              </IconButton>
            </Card>
          ))
        ) : (
          <Typography>No pending friend requests</Typography>
        )}
      </Paper>

      {/* Friends List */}
      <Paper
        elevation={3}
        sx={{ padding: 3, borderRadius: 3, marginBottom: 3 }}
      >
        <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
          Your Friends
        </Typography>
        <Grid container spacing={2}>
          {friends?.length > 0 ? (
            friends.map((friend) => (
              <Grid item xs={12} sm={6} md={4} key={friend?._id}>
                <Card
                  sx={{
                    padding: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Avatar sx={{ marginRight: 2 }}>
                    {friend?.name?.charAt(0) || "?"}
                  </Avatar>
                  <Typography variant="body1">
                    {friend?.name || "Unknown"}{" "}
                    {onlineUsers.has(friend?._id) ? "🟢 Online" : "🔴 Offline"}
                  </Typography>
                  <IconButton
                    onClick={() => unfriendUser(friend?._id)}
                    color="error"
                  >
                    <RemoveCircleOutlineIcon />
                  </IconButton>
                </Card>
              </Grid>
            ))
          ) : (
            <Typography>You have no friends yet</Typography>
          )}
        </Grid>
      </Paper>

      {/* Search Users */}
      <Paper
        elevation={3}
        sx={{ padding: 3, borderRadius: 3, marginBottom: 3 }}
      >
        <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
          Find New Friends
        </Typography>
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          sx={{ marginBottom: 2 }}
        >
          <TextField
            label="Search Friends"
            variant="outlined"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button variant="contained" color="primary" onClick={handleSearch}>
            Search
          </Button>
        </Box>
        {users?.length > 0 ? (
          users.map((u) =>
            u?._id !== user?._id ? (
              <Card
                key={u?._id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  padding: 2,
                  marginBottom: 2,
                }}
              >
                <Avatar sx={{ marginRight: 2 }}>
                  {u?.name?.charAt(0) || "?"}
                </Avatar>
                <Typography variant="body1">
                  {u?.name || "Unknown User"}
                </Typography>
                <IconButton
                  onClick={() => sendFriendRequest(u?._id)}
                  color="primary"
                >
                  <PersonAddIcon />
                </IconButton>
              </Card>
            ) : null
          )
        ) : (
          <Typography>No users found</Typography>
        )}
      </Paper>
    </Container>
  );
}

export default Friends;
