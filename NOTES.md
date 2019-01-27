# wth is webrtc?
- p2p video/audio/data realtime duplex / one-way transfer protocol
- part of HTML5 

# related technologies
- real-time communication between browsers
- media capture and streams
- media recording
- ScreenCapture

# compatibility
chrome, firefox, safari, desktop apps (electron?)

it used to be the case that H264 was the only video transfer protocol allowed on safari, but that is no longer the case. (since 2017 autumn?)

# protocol standardization / design
- W3C (API design)
- IETF (compression and protocol / network dynamics)

---

# Protocol Flow
- signaling
- offer / answer (session definition protocol)
- off SDP
- answer SDP
- NAT punching (STUN / TURN)
  - specify IP addr and port#
  - a STUN server is a dedicated server that tells clients the client's port# and ip addr
  - this enables clients to know their own global ip addr port# despite there being a NAT
- firewall punching
  - webrtc used UDP/IP and the port# is dynamically chosen (5000~6000 ish)
  - if a firewall exists, then a TURN server can be used to *relay* the session.
  - this is no longer p2p unfortunately
  - since the packets are encrypted and the keys are held only by the peers, sniffing is averted
- ICE candidate
  - shares information to peers regarding transmission routing (intranet, NAT, TURN, STUN)
  - vanilla ICE
    - synchronous
    - after all ICE Candidates are listed, trade ICE cnadidate info via SDP
  - trickle ICE
    - asynchronous
    - send SDP first
    - then, send ICE candidates whenever a possible candidate for transmission is discovered.
    - when an ICE candidate is accepted by a recipient, the P2P transmission begins even if the sender is still considering and possibly sending candidates

# Codecs
- video:
  - VP8, H.264 are mandatory
  - Safari supports only H.264
  - VP9 is default in chrome and firefox desktop
  - next gen protocol: AV1 (see Alliance for Open Media)

# WebRTC topology
- multiple peers
  - complete graph, performance decreases exponentially as peers increase
- SFU (selective forwarding unit)
  - a server streams data among all peers
  - ideal in a multiclient 
  - network load is a bottleneck, but clients have 

# Q:
- SFU / P2P critical #?
- vanilla ICE / trickle ICE merits/demerits
  - why is trickle ICE used more often?

# Debugging webrtc sessions:
chrome://webrtc-internals/
(create dump)
https://fippo.github.io/webrtc-dump-importer/