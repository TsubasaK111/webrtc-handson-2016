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
  // Vanilla ICE
  peerConn.onicecandidate = event => {
    if (event.candidate) {
      console.log(event.candidate);
    } else {
      console.log('empty ice event! ICE candidates have been exhausted, sending all candidates via SDP...');
      sendSdp(peerConn.localDescription);
    }
  };

  // // Trickle ICE
  // peerConn.onicecandidate = event => {
  //   if (event.candidate) {
  //  // Candidate情報を発見する都度相手と交換する
  //  // P2P接続するまでの時間を短縮できる可能性がある
  //     console.log(event.candidate);
  //     sendIceCandidate(event.candidate);
  //   } else {
  //     console.log('empty ice event');
  //   }
  // };

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

  return peerConn;
}


// 手動シグナリングのための処理を追加する
const sendSdp = (sessionDescription) => {
  // シグナリングで交換する情報をテキストエリアに表示する
  console.log('---sending sdp ---');
  textForSendSdp.value = sessionDescription.sdp;
  textForSendSdp.focus();
  textForSendSdp.select();
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
