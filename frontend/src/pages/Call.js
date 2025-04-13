import React, { useEffect, useRef, useState, useContext } from "react";
import { io } from "socket.io-client";
import AuthContext from "../context/AuthContext";
import Peer from "simple-peer";

const socket = io(process.env.REACT_APP_API_URL, { transports: ["websocket"] });

function Call() {
  const { user } = useContext(AuthContext);
  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState(null);
  const [friendId, setFriendId] = useState("");

  const myVideo = useRef();
  const friendVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
      setStream(currentStream);
      myVideo.current.srcObject = currentStream;
    });

    socket.on("incomingCall", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });

    return () => socket.off("incomingCall");
  }, []);

  const callUser = (id) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (signal) => {
      socket.emit("callUser", { to: id, signal, from: user.id });
    });

    peer.on("stream", (userStream) => {
      friendVideo.current.srcObject = userStream;
    });

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({ initiator: false, trickle: false, stream });

    peer.on("signal", (signal) => {
      socket.emit("answerCall", { to: caller, signal });
    });

    peer.on("stream", (userStream) => {
      friendVideo.current.srcObject = userStream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const endCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  return (
    <div>
      <h2>Video Call</h2>
      <div>
        <video playsInline muted ref={myVideo} autoPlay />
        {callAccepted && !callEnded ? <video playsInline ref={friendVideo} autoPlay /> : null}
      </div>
      <input type="text" placeholder="Friend ID" onChange={(e) => setFriendId(e.target.value)} />
      <button onClick={() => callUser(friendId)}>Call</button>
      {receivingCall && !callAccepted ? (
        <div>
          <h3>Incoming Call...</h3>
          <button onClick={answerCall}>Answer</button>
        </div>
      ) : null}
      {callAccepted && !callEnded && <button onClick={endCall}>End Call</button>}
    </div>
  );
}

export default Call;
