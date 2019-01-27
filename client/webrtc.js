// reference: https://qiita.com/yusuke84/items/43a20e3b6c78ae9a8f6c

const localVideo = document.getElementById('local_video');
const remoteVideo = document.getElementById('remote_video');
const textForSendSdp = document.getElementById('text_for_send_sdp');
const textToReceiveSdp = document.getElementById('text_for_receive_sdp');

let localStream = null;
let readyPeerConn = null;
let negotiationneededCounter = 0;
let isOffer = false;

// getUserMediaでカメラ、マイクにアクセス
const startVideo = async () => {
  try {
    localStream = await navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 }
        }
      });
    playVideo(localVideo, localStream);
  } catch (err) {
    console.error('mediaDevice.getUserMedia() error:', err);
  }
}


// Videoの再生を開始する
const playVideo = async (element, stream) => {
  element.srcObject = stream;
  try {
    // 非同期っぽく書く必要があるらしい
    await element.play();
  } catch (erro) {
    console.log('error auto play:' + error);
  }
}


// WebRTCを利用する準備をする
const prepareNewConnection = (isOffer) => {
  // we're using the STUN server freely hosted by NTT's SkyWay to punch through the NAT
  const rtcConfig =
    { "iceServers": [{ "urls": "stun:stun.webrtc.ecl.ntt.com:3478" }] };
  const peerConn = new RTCPeerConnection(rtcConfig);

  // 「リモートのMediaStreamTrackを受信した」時にイベントが発火
  peerConn.ontrack = event => {
    console.log('-- peerConn.ontrack()');
    playVideo(remoteVideo, event.streams[0]);
  };

  // 「ICE Candidateを収集した」時にイベントが発火
  peerConn.onicecandidate = event => {
    if (event.candidate) {
      // Trickle ICE
      // Candidate情報を発見する都度相手と交換する
      // P2P接続するまでの時間を短縮できる可能性がある
      console.log(event.candidate);
      sendIceCandidate(event.candidate);
    } else {
      console.log('empty ice event');
      // Vanilla ICE
      // console.log('ICE candidates have been exhausted, sending all candidates via SDP...');
      // sendSdp(peerConn.localDescription);
    }
  };

  // ローカルのMediaStreamを利用できるようにする
  // if there are any local MediaStreams (eg video etc), then acquire those tracks and add them to the RTCPeerConnection
  if (localStream) {
    console.log('Adding local stream...');
    localStream.getTracks().forEach(track => peerConn.addTrack(track, localStream));
  } else {
    console.warn('no local stream, but continuing.');
  }

  // If there is no peer connection ready, a negotiation is needed. start by making an offer.
  // for some reason, if there are multiple tracks then onnegotiationneeded will fire multiple times in Chrome 71.
  // createOffer needs to be called only once, so we have a negotiationneededCounter.
  peerConn.onnegotiationneeded = async () => {
    try {
      if (isOffer) {
        if (negotiationneededCounter === 0) {
          let offer = await peerConn.createOffer();
          console.log('createOffer() successful!');
          await peerConn.setLocalDescription(offer);
          console.log('setLocalDescription() successful!');
          sendSdp(peerConn.localDescription);
          negotiationneededCounter++;
        }
      }
    } catch (err) {
      console.error('setLocalDescription(offer) ERROR: ', err);
    }
  }

  // ICEのステータスが変更になったときの処理
  peerConn.oniceconnectionstatechange = () => {
    console.log('ICE connection Status has changed to ' + peerConn.iceConnectionState);
    switch (peerConn.iceConnectionState) {
      case 'closed':
      case 'failed':
        if (readyPeerConn) {
          hangUp();
        }
        break;
      case 'dissconnected':
        break;
    }
  };

  return peerConn;
}


// シグナリングで交換する情報を
const sendSdp = (sessionDescription) => {
  console.log('---sending sdp ---');
  textForSendSdp.value = sessionDescription.sdp;
  /*---
   textForSendSdp.focus();
   textForSendSdp.select();
   ----*/
  const message = JSON.stringify(sessionDescription);
  console.log('sending SDP=' + message);
  ws.send(message);
}


// Connectボタンが押されたらWebRTCのOffer処理を開始
const connect = () => {
  if (!readyPeerConn) {
    console.log('make Offer');
    readyPeerConn = prepareNewConnection(true);
  }
  else {
    console.warn('RTCPeerConnection already exists.');
  }
}


// Answer SDPで返答する
const returnAnswer = async () => {
  console.log('sending Answer. Creating remote session description...');
  if (!readyPeerConn) {
    console.error("readyPeerConn doesn't exist!");
    return;
  }
  try {
    let answer = await readyPeerConn.createAnswer();
    console.log('createAnswer() successful!');
    await readyPeerConn.setLocalDescription(answer);
    console.log('setLocalDescription() successful!');
    sendSdp(readyPeerConn.localDescription);
  } catch (err) {
    console.error(err);
  }
}


// Receive remote SDPボタンが押されたらOffer側とAnswer側で処理を分岐
const onSdpText = () => {
  const text = textToReceiveSdp.value;
  if (readyPeerConn) {
    console.log('Received answer text...');
    const answer = new RTCSessionDescription({
      type: 'answer',
      sdp: text,
    });
    setAnswer(answer);
  }
  else {
    console.log('Received offer text...');
    const offer = new RTCSessionDescription({
      type: 'offer',
      sdp: text,
    });
    setOffer(offer);
  }
  textToReceiveSdp.value = '';
}

// Offer側のSDPをセットする処理
const setOffer = async (sessionDescription) => {
  if (readyPeerConn) {
    console.error('RTCPeerConnection already exists');
  }
  readyPeerConn = prepareNewConnection(false);
  try {
    await readyPeerConn.setRemoteDescription(sessionDescription);
    console.log('setRemoteDescription(answer) successful!');
    returnAnswer();
  } catch (err) {
    console.error('setRemoteDescription(offer) ERROR: ', err);
  }
}

// Answer側のSDPをセットする場合
const setAnswer = async (sessionDescription) => {
  if (!readyPeerConn) {
    console.error('RTCPeerConnection does not exist');
    return;
  }
  try {
    // console.log(`DEBUG: sessionDescription`);
    // console.log(sessionDescription);
    await readyPeerConn.setRemoteDescription(sessionDescription);
    console.log('setRemoteDescription(answer) successful!');
  } catch (err) {
    console.error('setRemoteDescription(answer) ERROR: ', err);
  }
}


// P2P通信を切断する
const hangUp = () => {
  if (readyPeerConn) {
    if (readyPeerConn.iceConnectionState !== 'closed') {
      readyPeerConn.close();
      readyPeerConn = null;
      negotiationneededCounter = 0;
      const message = JSON.stringify({ type: 'close' });
      console.log('sending close message');
      ws.send(message);
      cleanupVideoElement(remoteVideo);
      textForSendSdp.value = '';
      textToReceiveSdp.value = '';
      return;
    }
  }
  console.log('RTCPeerConnection is closed.');
}


// ビデオエレメントを初期化する
const cleanupVideoElement = (element) => {
  element.pause();
  element.srcObject = null;
}

// ----

const wsUrl = 'ws://localhost:3001/';

const ws = new WebSocket(wsUrl);
ws.onopen = (evt) => {
  console.log('ws open()');
};
ws.onerror = (err) => {
  console.error('ws onerror() ERR:', err);
};
ws.onmessage = (evt) => {
  console.log('ws onmessage() data:', evt.data);
  const message = JSON.parse(evt.data);
  // シグナリングサーバからメッセージを受信した際のイベントを定義する
  // offer 、 answer それぞれのメッセージを受信した際には、 setOffer() 、 setAnswer() する
  // Trickle ICEで ICE candidate メッセージを受信した場合は、 RTCIceCandidate を使ってオブジェクト化し addIceCandidate() を実行する
  switch (message.type) {
    case 'offer': {
      console.log('Received offer ...');
      textToReceiveSdp.value = message.sdp;
      setOffer(message);
      break;
    }
    case 'answer': {
      console.log('Received answer ...');
      textToReceiveSdp.value = message.sdp;
      setAnswer(message);
      break;
    }
    case 'candidate': {
      console.log('Received ICE candidate ...');
      const candidate = new RTCIceCandidate(message.ice);
      console.log(candidate);
      addIceCandidate(candidate);
      break;
    }
    case 'close': {
      console.log('peer is closed ...');
      hangUp();
      break;
    }
    default: {
      console.log("Invalid message");
      break;
    }
  };
};

// ICE candaidate受信時にセットする
function addIceCandidate(candidate) {
  if (peerConnection) {
    peerConnection.addIceCandidate(candidate);
  }
  else {
    console.error('PeerConnection not exist!');
    return;
  }
}

// ICE candidate生成時に送信する
function sendIceCandidate(candidate) {
  console.log('---sending ICE candidate ---');
  const message = JSON.stringify({ type: 'candidate', ice: candidate });
  console.log('sending candidate=' + message);
  ws.send(message);
}