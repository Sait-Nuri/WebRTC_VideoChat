var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

var sendChannel;
var sendButton = document.getElementById("sendButton");
var sendTextarea = document.getElementById("dataChannelSend");
var receiveTextarea = document.getElementById("dataChannelReceive");

var offerSDP_sent_from_offerer;
var pc;
var configuration;
var MediaStream_1, MediaStream_2, MediaStream_3;
var localStream, remoteStream;
var is_creator = false;

//Servera mesaj göndermek
function sendMessage(message){
    console.log('Sending message: ', message);
    socket.emit('message', message);
}

function handleIceCandidate(event) {
    console.log('handleIceCandidate event: ', event);
    if (event.candidate) {
        sendMessage({
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate});
    } 
    else {
        console.log('End of candidates.');
    }
}

function handleRemoteStreamAdded(event) {
    console.log('Remote stream added.');
    attachMediaStream(remoteVideo, event.stream);
    remoteStream = event.stream;
}

function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed.');
    attachMediaStream(remoteVideo, null);
    remoteStream = null;
}

function sendOfferSDP(sdp){
    sendMessage(sdp);
}

function sendAnswerSDP(sdp){
    sendMessage(sdp);
}

function handleChannelMessage(event) {
    trace('Received message: ' + event.data);
    receiveTextarea.value = event.data;
}

function handleChannelOpened(channel){
    sendChannel = channel;
    dataChannelSend.disabled = false;
    dataChannelSend.focus();
    dataChannelSend.placeholder = "";
    sendButton.disabled = false;   
}

function handleChannelClosed(event){
    dataChannelSend.disabled = true;
    sendButton.disabled = true; 
}

function handleChannelError(event){
    handleChannelClosed(event);
}

function sendData() {
    var data = sendTextarea.value;
    sendChannel.send(data);
    trace('Sent data: ' + data);
}

function handleUserMediaError(error){
    console.log('getUserMedia error: ', error);
}

function handleUserMedia(stream) {
    console.log('Adding local stream.');
    localStream = stream;
    attachMediaStream(localVideo, stream);

    if(!is_creator){
        createPeerConnection();
        pc.addStream(localStream);
        sendMessage('got user media');
    }
        
}
/*
function handleNegotiation(argument) {
    console.log('handleNegotiation');
    createOffer();
}
*/
function createPeerConnection(){
    console.log('createPeerConnection');    

    try{
        pc = new RTCPeerConnection(iceServers, pc_constraints);
        pc.onicecandidate = handleIceCandidate;       
    }catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }

    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    //pc.onnegotiationneeded = handleNegotiation;
}

function GUM () {
    var constraints = {
        audio: true, 
        video: true
    }

    getUserMedia(constraints, handleUserMedia, handleUserMediaError);
}

function createOfferError(){
    console.log('createOffer() error: ', error);
}

function setLocalAndSendMessage(sessionDescription) {
    pc.setLocalDescription(sessionDescription);
    sendMessage(sessionDescription);
}

function createOffer () {
    var offerOptions = {'offerToReceiveAudio':true,
                        'offerToReceiveVideo':true
                        };

    console.log('Sending offer to peer.');
    pc.createOffer(setLocalAndSendMessage, createOfferError, offerOptions);
}

function createAnswerError () {
    console.log('createAnswerError() error: ');
}

function createAnswer () {
    var sdpConstraints = {
        'mandatory': {
            'OfferToReceiveAudio':true,
            'OfferToReceiveVideo':true }
    };

    console.log('Sending answer to peer.');
    pc.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
}

var socket = io.connect();
var room = "room1";
socket.emit('join', room);

socket.on('message', function (message){
    
    if (message.type === 'offer') {
        console.log('offer received!');

        pc.setRemoteDescription(new RTCSessionDescription(message));
        createAnswer();
    } 
    else if (message.type === 'answer') {
        console.log('answer received!');
        pc.setRemoteDescription(new RTCSessionDescription(message));
    } 
    else if (message.type === 'candidate') {
        var candidate = new RTCIceCandidate({   
                sdpMLineIndex:message.label,
                candidate:message.candidate});
        pc.addIceCandidate(candidate);
    }
    else if(message === 'got user media' && is_creator){
        createPeerConnection();
        pc.addStream(localStream);
        createOffer();
    }
});

socket.on('created', function (message){
    console.log(message);
    is_creator = true;
    GUM();
});

socket.on('joined', function (message){
    console.log(message);
    GUM();
});


socket.on('welcome', function (message){
    console.log(message);
});
/*
socket.on('peer_connected', function (message){
    if(!is_creator)
        return;

    console.log(message);

    createPeerConnection();
    pc.addStream(localStream);
});
*/
