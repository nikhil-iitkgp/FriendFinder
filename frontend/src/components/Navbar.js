import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";
import { AppBar, Toolbar, Button, Avatar } from "@mui/material"; // ✅ Added Avatar
import PeopleIcon from "@mui/icons-material/People";
import SearchIcon from "@mui/icons-material/Search";
import ChatIcon from "@mui/icons-material/Chat";
import CallIcon from "@mui/icons-material/Call";
import LogoutIcon from "@mui/icons-material/Logout";

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <h2 onClick={() => navigate("/") }style={{ flexGrow: 1 }}>FriendFinder</h2>
        {user && (
          <>
            <Button startIcon={<PeopleIcon />} color="inherit" onClick={() => navigate("/friends")}>
              Friends
            </Button>
            <Button startIcon={<SearchIcon />} color="inherit" onClick={() => navigate("/search")}>
              Find Friends
            </Button>
            <Button startIcon={<ChatIcon />} color="inherit" onClick={() => navigate("/chat")}>
              Chat
            </Button>
            <Button startIcon={<CallIcon />} color="inherit" onClick={() => navigate("/call")}>
              Call
            </Button>
            <Button color="inherit" onClick={() => navigate("/profile")}>
              <Avatar src={user.profilePicture} alt="Profile" style={{ width: 30, height: 30 }} />
            </Button>
            <Button startIcon={<LogoutIcon />} color="inherit" onClick={() => { logout(); navigate("/login"); }}>
              Logout
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;
