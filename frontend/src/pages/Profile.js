import React, { useState, useEffect, useContext } from "react";
import { api } from "../api/api";
import AuthContext from "../context/AuthContext";
import { 
  Container, Paper, Box, Typography, Avatar, Button, TextField, Grid2 as Grid, IconButton 
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";

function Profile() {
  const { user, setUser } = useContext(AuthContext);
  const [profile, setProfile] = useState({});
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [editing, setEditing] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    api.get("/api/profile")
      .then((res) => {
        setProfile(res.data);
        setName(res.data.name);
        setBio(res.data.bio);
        setProfilePicture(res.data.profilePicture);
      })
      .catch((err) => console.error("Error fetching profile", err));
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("bio", bio);
    if (imageFile) {
      formData.append("profilePicture", imageFile);
    }

    try {
      const response = await api.put("/api/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Profile updated successfully!");
      setEditing(false);
      setProfile(response.data.user);
      setUser(response.data.user);
    } catch (err) {
      alert("Update failed. Try again.");
      console.error("Error updating profile:", err);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 3, textAlign: "center", mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Profile
        </Typography>

        {!editing ? (
          <Box>
            <Avatar 
              src={profilePicture || profile.profilePicture} 
              alt="Profile" 
              sx={{ width: 100, height: 100, mx: "auto", mb: 2 }}
            />
            <Typography variant="h6">{profile.name}</Typography>
            <Typography color="textSecondary">{profile.bio}</Typography>
            <Button 
              startIcon={<EditIcon />} 
              onClick={() => setEditing(true)} 
              variant="contained" 
              sx={{ mt: 2 }}
            >
              Edit Profile
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleUpdate}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box display="flex" justifyContent="center" alignItems="center" position="relative">
                  <Avatar 
                    src={profilePicture || profile.profilePicture} 
                    sx={{ width: 120, height: 120 }}
                  />
                  <IconButton 
                    component="label"
                    sx={{ position: "absolute", bottom: 0, right: 10, backgroundColor: "white" }}
                  >
                    <AddAPhotoIcon />
                    <input 
                      type="file" 
                      accept="image/*" 
                      hidden 
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setImageFile(file);
                          setProfilePicture(URL.createObjectURL(file));
                        }
                      }} 
                    />
                  </IconButton>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  label="Name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  label="Bio" 
                  multiline 
                  rows={3} 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)} 
                  required 
                />
              </Grid>

              <Grid item xs={12} display="flex" justifyContent="space-between">
                <Button 
                  startIcon={<SaveIcon />} 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                >
                  Save Changes
                </Button>
                <Button 
                  startIcon={<CloseIcon />} 
                  variant="outlined" 
                  color="error" 
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default Profile;
