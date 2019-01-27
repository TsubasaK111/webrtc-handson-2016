// reference: https://qiita.com/yusuke84/items/43a20e3b6c78ae9a8f6c

const localVideo = document.getElementById('local_video');
const remoteVideo = document.getElementById('remote_video');
const textForSendSdp = document.getElementById('text_for_send_sdp');
const textToReceiveSdp = document.getElementById('text_for_receive_sdp');
let localStream = null;
let peerConnection = null;
let negotiationneededCounter = 0;
let isOffer = false;


// // a simple setup
// navigator
//   // 最低でも640x480以上、出来たら1280x720が良いけどだめならよしなにやってください
//   .getUserMedia({
//     video: true, audio: true
//   })
//   .then(function (stream) { // success
//   }).catch(function (error) { // error
//     return;
//   });

// getUserMediaでカメラ、マイクにアクセス
const startVideo = async () => {
  try {
    localStream = await navigator.mediaDevices
      .getUserMedia({
        audio: true,
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
