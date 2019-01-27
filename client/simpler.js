// reference: https://qiita.com/yusuke84/items/43a20e3b6c78ae9a8f6c

const localVideo = document.getElementById('local_video');
const remoteVideo = document.getElementById('remote_video');
const textForSendSdp = document.getElementById('text_for_send_sdp');
const textToReceiveSdp = document.getElementById('text_for_receive_sdp');
let localStream = null;
let peerConnection = null;
let negotiationneededCounter = 0;
let isOffer = false;

// getUserMediaでカメラ、マイクにアクセス
// a simple setup
navigator
  // 最低でも640x480以上、出来たら1280x720が良いけどだめならよしなにやってください
  .getUserMedia({
    video: true, audio: true
  })
  .then(function (stream) { // success
  }).catch(function (error) { // error
    return;
  });