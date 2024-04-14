import React, { useRef } from "react";
import { useEffect } from "react";
import { useState } from "react";
import { Button, Typography, Input } from "antd";
import "./App.css";

function App() {
  const { Title, Paragraph } = Typography;
  const { TextArea } = Input;
  const URL_WEB_SOCKET = "ws://localhost:8090/ws";
  const ws = useRef(null);

  const [localStream, setLocalStream] = useState();

  const setupDevice = () => {
    console.log("setupDevice invoked");
    navigator.getUserMedia(
      { audio: true, video: true },
      (stream) => {
        // render local stream on DOM
        const localPlayer = document.getElementById("localPlayer");
        localPlayer.srcObject = stream;
        setLocalStream(stream);
      },
      (error) => {
        console.error("getUserMedia error:", error);
      }
    );
  };

  const constraints = {
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
    audio: true,
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      // Handle the media stream as needed.
    })
    .catch((error) => {
      // Handle the error if constraints cannot be satisfied.
    });

  let servers;
  const pcConstraints = {
    optional: [{ DtlsSrtpKeyAgreement: true }],
  };

  // When user clicks call button, we will create the p2p connection with RTCPeerConnection
  const callOnClick = () => {
    console.log("callOnClick invoked");
    if (localStream.getVideoTracks().length > 0) {
      console.log(
        `Using video device: ${localStream.getVideoTracks()[0].label}`
      );
    } 
    if (localStream.getAudioTracks().length > 0) {
      console.log(
        `Using audio device: ${localStream.getAudioTracks()[0].label}`
      );
    }
    var localPeerConnection = new RTCPeerConnection(servers, pcConstraints);
    localPeerConnection.onicecandidate = gotLocalIceCandidateOffer;
    localPeerConnection.onaddstream = gotRemoteStream;
    localPeerConnection.addStream(localStream);
    localPeerConnection.createOffer().then(gotLocalDescription);
  };
  // async function to handle offer sdp
  const gotLocalDescription = (offer) => {
    console.log("gotLocalDescription invoked:", offer);
    localPeerConnection.setLocalDescription(offer);
  };
  // async function to handle received remote stream
  const gotRemoteStream = (event) => {
    console.log("gotRemoteStream invoked");
    const remotePlayer = document.getElementById("peerPlayer");
    remotePlayer.srcObject = event.stream;
  };
  // async function to handle ice candidates
  const gotLocalIceCandidateOffer = (event) => {
    console.log(
      "gotLocalIceCandidateOffer invoked",
      event.candidate,
      localPeerConnection.localDescription
    );
    // when gathering candidate finished, send complete sdp
    if (!event.candidate) {
      const offer = localPeerConnection.localDescription;
      // send offer sdp to signaling server via websocket
      sendWsMessage("send_offer", {
        channelName,
        userId,
        sdp: offer,
      });
    }
  };
  const join = ()=>{
    sendWsMessage('join', {channelName:"Room1", userId:'UserA'});
  };
  useEffect(() => {
    const wsClient = new WebSocket(URL_WEB_SOCKET);
    wsClient.onopen = () => {
      console.log("ws opened");
      ws.current = wsClient;
      // setup camera and join channel after ws opened
      join();
      setupDevice();
      console.log(localStream);
    };
    wsClient.onclose = () => console.log("ws closed");
    wsClient.onmessage = (message) => {
      console.log("ws message received", message.data);
      const parsedMessage = JSON.parse(message.data);
      switch (parsedMessage.type) {
        case "joined": {
          const body = parsedMessage.body;
          console.log("users in this channel", body);
          break;
        }
        case "offer_sdp_received": {
          const offer = parsedMessage.body;
          onAnswer(offer);
          break;
        }
        case "answer_sdp_received": {
          gotRemoteDescription(parsedMessage.body);
          break;
        }
        case "quit": {
          break;
        }
        default:
          break;
      }
    };

    const onAnswer = (offer) => {
    console.log('onAnswer invoked');
    setCallButtonDisabled(true);
    setHangupButtonDisabled(false);

    if (localStream.getVideoTracks().length > 0) {
            console.log(`Using video device: ${localStream.getVideoTracks()[0].label}`);
        }
        if (localStream.getAudioTracks().length > 0) {
            console.log(`Using audio device: ${localStream.getAudioTracks()[0].label}`);
        }
        localPeerConnection = new RTCPeerConnection(servers, pcConstraints);
        localPeerConnection.onicecandidate = gotLocalIceCandidateAnswer;
        localPeerConnection.onaddstream = gotRemoteStream;
        localPeerConnection.addStream(localStream);
        localPeerConnection.setRemoteDescription(offer);
        localPeerConnection.createAnswer().then(gotAnswerDescription);
    };
        const gotRemoteStream = (event) => {
        console.log('gotRemoteStream invoked');
        const remotePlayer = document.getElementById('peerPlayer');
        remotePlayer.srcObject = event.stream;
    };
        const gotAnswerDescription = (answer) => {
        console.log('gotAnswerDescription invoked:', answer);
        localPeerConnection.setLocalDescription(answer);
    };

    const gotLocalIceCandidateAnswer = (event) => {
        console.log('gotLocalIceCandidateAnswer invoked', event.candidate, localPeerConnection.localDescription);
        // gathering candidate finished, send complete sdp
        if (!event.candidate) {
            const answer = localPeerConnection.localDescription;
            sendWsMessage('send_answer', {
                channelName,
                userId,
                sdp: answer,
            });
         }
     };

    return () => {
      if(wsClient)
      {
          // wsClient.close();
      }
    };
  }, []);
  const sendWsMessage = (type, body) => {
    console.log("sendWsMessage invoked", type, body);
    ws.current.send(
      JSON.stringify({
        type,
        body,
      })
    );
  };
  const renderHelper = () => {
    return (
      <div className="wrapper">
        <Input placeholder="User ID" style={{ width: 240, marginTop: 16 }} />
        <Input
          placeholder="Channel Name"
          style={{ width: 240, marginTop: 16 }}
        />
        <Button
          style={{ width: 240, marginTop: 16 }}
          type="primary"
          onClick={callOnClick}
        >
          Call
        </Button>
        <Button danger style={{ width: 240, marginTop: 16 }} type="primary">
          Hangup
        </Button>
      </div>
    );
  };

  const renderTextarea = () => {
    return (
      <div className="wrapper">
        <TextArea
          style={{ width: 240, marginTop: 16 }}
          placeholder="Send message"
        />
        <TextArea
          style={{ width: 240, marginTop: 16 }}
          placeholder="Receive message"
          disabled
        />
        <Button style={{ width: 240, marginTop: 16 }} type="primary">
          Send Message
        </Button>
      </div>
    );
  };

  return (
    <div className="App">
      <div className="App-header">
        <Title>WebRTC</Title>
        <Paragraph>
          This is a simple demo app that demonstrates how to build a WebRTC
          application from scratch, including a signaling server. It serves as a
          step-by-step guide to help you understand the process of implementing
          WebRTC in your own projects.
        </Paragraph>
        <div
          className="wrapper-row"
          style={{ justifyContent: "space-evenly", width: "50%" }}
        >
          {renderHelper()}
          {renderTextarea()}
        </div>
        <div className="playerContainer" id="playerContainer">
          <video id="peerPlayer" autoPlay style={{ width: 640, height: 480 }} />
          <video
            id="localPlayer"
            autoPlay
            style={{ width: 640, height: 480 }}
          />
        </div>
      </div>
    </div>
  );
}
export default App;
