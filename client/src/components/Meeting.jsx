import React, { useEffect, useRef } from "react";

const Meeting = () => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const localStream = useRef();
  const peerConnection = useRef();
  const serverConnection = useRef();
  const uuid = createUUID();

  const peerConnectionConfig = {
    iceServers: [
      { urls: "stun:stun.stunprotocol.org:3478" },
      { urls: "stun:stun.l.google.com:19302" },
    ],
  };

  useEffect(() => {
    pageReady();

    return () => {
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (serverConnection.current) {
        serverConnection.current.close();
      }
    };
  }, []);

  async function pageReady() {
    const constraints = {
      video: true,
      audio: true, // make sure audio is true
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Proceed with the rest of the logic
      const domain = "localhost:8443"; // ensure this points to your WebSocket server
      serverConnection.current = new WebSocket(`wss://${domain}`);
      serverConnection.current.onmessage = gotMessageFromServer;

      start(true);
    } catch (error) {
      errorHandler(error);
    }
  }

  function start(isCaller) {
    // check server connection
    if (
      !serverConnection.current ||
      serverConnection.current.readyState !== WebSocket.OPEN
    ) {
      return;
    }

    peerConnection.current = new RTCPeerConnection(peerConnectionConfig);
    peerConnection.current.onicecandidate = gotIceCandidate;
    peerConnection.current.ontrack = gotRemoteStream;

    for (const track of localStream.current.getTracks()) {
      peerConnection.current.addTrack(track, localStream.current);
    }

    if (isCaller) {
      peerConnection.current
        .createOffer()
        .then(createdDescription)
        .catch(errorHandler);
    }
  }

  function gotMessageFromServer(message) {
    if (!peerConnection.current) start(false);

    const signal = JSON.parse(message.data);

    // Ignore messages from ourself
    if (signal.uuid === uuid) return;

    if (signal.sdp) {
      peerConnection.current
        .setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          // Only create answers in response to offers
          if (signal.sdp.type !== "offer") return;

          peerConnection.current
            .createAnswer()
            .then(createdDescription)
            .catch(errorHandler);
        })
        .catch(errorHandler);
    } else if (signal.ice) {
      peerConnection.current
        .addIceCandidate(new RTCIceCandidate(signal.ice))
        .catch(errorHandler);
    }
  }

  function gotIceCandidate(event) {
    if (event.candidate != null) {
      serverConnection.current.send(
        JSON.stringify({ ice: event.candidate, uuid: uuid })
      );
    }
  }

  function createdDescription(description) {
    console.log("got description");

    peerConnection.current
      .setLocalDescription(description)
      .then(() => {
        serverConnection.current.send(
          JSON.stringify({
            sdp: peerConnection.current.localDescription,
            uuid: uuid,
          })
        );
      })
      .catch(errorHandler);
  }

  function gotRemoteStream(event) {
    console.log("got remote stream");
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = event.streams[0];
    }
  }

  function errorHandler(error) {
    console.log(error);
  }

  function createUUID() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }

    return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4() + s4() + s4()}`;
  }

  function muteMic() {
    const audioTracks = localStream.current.getAudioTracks();
    if (audioTracks.length > 0) {
      audioTracks[0].enabled = !audioTracks[0].enabled;
    }
  }

  function muteCam() {
    const videoTracks = localStream.current.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks[0].enabled = !videoTracks[0].enabled;
    }
  }

  return (
    <div>
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "40%" }}
      ></video>
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        style={{ width: "40%" }}
      ></video>

      <div style={{ marginTop: "10px" }}>
        Open this page in a second browser window then click below to start the
        WebRTC connection.
      </div>

      <div style={{ marginTop: "10px" }}>
        <input
          type="button"
          id="start"
          value="Start WebRTC"
          onClick={() => start(true)}
        ></input>
        <input
          type="button"
          id="muteCam"
          value="Mute Cam"
          onClick={muteCam}
        ></input>
        <input
          type="button"
          id="muteMic"
          value="Mute Mic"
          onClick={muteMic}
        ></input>
      </div>
    </div>
  );
};

export default Meeting;
