const MESSAGE_ENUM = Object.freeze({
  SELF_CONNECTED: "SELF_CONNECTED",
  CLIENT_CONNECTED: "CLIENT_CONNECTED",
  CLIENT_DISCONNECTED: "CLIENT_DISCONNECTED",
  CLIENT_MESSAGE: "CLIENT_MESSAGE",
  SERVER_MESSAGE: "SERVER_MESSAGE",
});
//const localVideo = document.getElementById('localVideo');
const localVideo = document.querySelector('#localVideo');
const remoteVideo = document.querySelector('#remoteVideo');
let localStream;
let remoteStream;
var alreadySendOne = false;

document.getElementById("localButton").onclick = () => getLocalVideo();
document.getElementById("localVideoButton").onclick = () => getLocalVideoFromSrc();
document.getElementById("offerButton").onclick = () => zaoferuj();

const ws = createConnection("localhost",7777);
//isStunAddressUp("stun.l.google.com:19302", 5000).then(result => console.log(result));

//getLocalVideoFromSrc();
const configuration = {'iceServers': [{'urls': 'stun:stun.l.google.com:19302'}]};
let peerConnection = new RTCPeerConnection(configuration);
peerConnection.addEventListener('icecandidate', event => {
  console.log("Nie wysyłam tego: ",event.candidate);
  if (event.candidate && !alreadySendOne) {
    alreadySendOne = true;
    console.log("New ice candidate: ",event.candidate);
    ws.send(JSON.stringify({ type: MESSAGE_ENUM.CLIENT_MESSAGE, body: { subject: "newIceCandidate", candidate: event.candidate } }));
  }
});
peerConnection.addEventListener("track", event => {
  console.log("Przyszedł stream: ",event);
  remoteVideo.srcObject = event.streams[0];
  // const [remoteStream1] = event.streams;
  
  // remoteVideo.srcObject = remoteStream1;
  console.log(remoteVideo);
});

function getLocalVideoFromSrc() {
  document.getElementById("localButton").disabled = true;
  localVideo.src="chrome.webm";
  if (localVideo.captureStream) {
    localStream = localVideo.captureStream();
    console.log('Captured stream from leftVideo with captureStream',localStream);
  } else 
  if (localVideo.mozCaptureStream) {
    localStream = localVideo.mozCaptureStream();
    console.log('Captured stream from leftVideo with mozCaptureStream()',localStream);
  } else {
    console.log("Couldn't capture stream.");
  }
  if (localStream) { 
    console.log("localStream",localStream);
    localVideo.oncanplay = () => {
      //remoteVideo.srcObject = localStream;
      // localStream.getTracks().forEach(t => {
      //   console.log("track: ",t);
      //   peerConnection.addTrack(t, localStream);
      // });
    }
    
  }
}

function getLocalVideo() {
  document.getElementById("localButton").disabled = true;
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      localVideo.srcObject = stream;
      localStream = stream;
      console.log("Lokalny Stream: ",localStream);
      // localStream.getTracks().forEach(t => {
      //   peerConnection.addTrack(t, localStream);
      // });
      //peerConnection.addStream(localStream);
      //zaoferuj();
    })
    .catch(reason => {
      console.log("Nieudało się przechwycić kamery " + reason);
    });
}

function zaoferuj() {
  localStream.getTracks().forEach(t => {
    peerConnection.addTrack(t, localStream);
  });
  peerConnection.createOffer({
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
  }).then(desc => {
    peerConnection.setLocalDescription(desc).then((description) => {
      ws.send(JSON.stringify({ type: MESSAGE_ENUM.CLIENT_MESSAGE, body: { subject: "offer", offer: desc } }));
    })
  })
}

function getRemoteVideo() {
  

}

function createConnection(serverIP,port) {
  var username = "";

  const ws = new WebSocket(`ws://${serverIP}:${port}/ws`);
  ws.onopen = evt => {
    console.log("Otwarte połączenie.");
  };
  ws.onmessage = evt => {
    let msg = JSON.parse(evt.data);
    if (msg.sender == username) return;
    switch(msg.type) {
      case MESSAGE_ENUM.SELF_CONNECTED:
        console.log(`You are connected! Your username is ${msg.body.name}`);
        username = msg.body.name;
        break;
      case MESSAGE_ENUM.CLIENT_CONNECTED:
        console.log(`${msg.body.name} has connected.`);
        break;
      case MESSAGE_ENUM.CLIENT_DISCONNECTED:
        console.log(`${msg.body.name} has disconnected.`);
        break;
      case MESSAGE_ENUM.CLIENT_MESSAGE:
        console.log("Message: ",msg.body.subject);
        switch(msg.body.subject) {
          case "offer":
            console.log(`Got offer from ${msg.sender}: ${msg.body.offer}`);
            peerConnection.setRemoteDescription(new RTCSessionDescription(msg.body.offer));
            peerConnection.createAnswer().then(desc => {
              peerConnection.setLocalDescription(desc).then(
                () => ws.send(JSON.stringify({ type: MESSAGE_ENUM.CLIENT_MESSAGE, body: { subject: "answer", answer: desc } }))
              );
            });
            break;
          case "answer":
            console.log(`Got answer from ${msg.sender}.`);
            const remoteDesc = new RTCSessionDescription(msg.body.answer);
            peerConnection.setRemoteDescription(remoteDesc);
            peerConnection.addEventListener('connectionstatechange', event => {
              console.log("Coś się zmieniło: ", event, peerConnection.connectionState);
            });
            break;
          case "newIceCandidate":
            peerConnection.addEventListener('connectionstatechange', event => {
              console.log("Coś się zmieniło: ", event, peerConnection.connectionState);
            });
            peerConnection.addIceCandidate(msg.body.candidate)
            .then(() => console.log("Added ice candidate: ", msg.body.candidate))
            .catch(reason => console.log("Error adding Ice Candidate " + reason));
            break;
        }
        break;
    }
  };
  ws.onclose = evt => {
    console.log("Connection closed");
  };
  return ws;
}

/*
function isStunAddressUp(address, _timeout){
  _timeout = _timeout || 6000;
  let response = {
      myIpAddress: "",
      stun: address,
      ipv6Supported: true,
      errors: []
  };

  let checker = new Promise((resolve, reject) => {
      const pc = new RTCPeerConnection({
          iceServers: [
              {urls: `stun:${address}?transport=udp`}
          ]
      });
      
      pc.onicecandidate = (e) => {
          if (!e.candidate) return;

          // If a srflx candidate was found, notify that the STUN server works and provide the IP
          if(e.candidate.type == "srflx"){
              response.myIpAddress = e.candidate.address;
              console.log("OnIceCandidate: ",e);
              pc.close();
          }
      };
      
      // Log errors:
      // Remember that in most of the cases, even if its working, you will find a STUN host lookup received error
      // Chrome tried to look up the IPv6 DNS record for server and got an error in that process. However, it may still be accessible through the IPv4 address
      pc.onicecandidateerror = (e) => {
          if(e.address == "[0:0:0:x:x:x:x:x]"){
              response.ipv6Supported = false;
          }
          
          response.errors.push(e);
      };
      
      pc.onclose = function () {
          console.log("datachannel close");
      };
      
      var dc = pc.createDataChannel('ourcodeworld-rocks');
      pc.createOffer().then(offer => pc.setLocalDescription(offer));

      dc.onclose = function (e) {
          resolve(response);
      };
  });

  let timeout = new Promise(function(resolve, reject){
      setTimeout(function() {
          reject(response);
      }, _timeout);
  });

  return Promise.race([checker, timeout]);
}
*/