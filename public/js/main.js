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
var PC = [];
var index_pc = 0;
var offer_done = false;
var candidate_done = false;
var peer_id;

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
    
    if(!is_creator)
        candidate_done = true;
    else
        index_pc++;
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

function handleRemoteHangup(id) {
    console.log('client: ' + id + ' exited.');
    PC[id].close();
    PC[id] = null;
}

function handleUserMediaError(error){
    console.log('getUserMedia error: ', error);
}

function handleUserMedia(stream) {
    console.log('Adding local stream.');
    localStream = stream;
    attachMediaStream(localVideo, stream);

    if(!is_creator){
        pc = createPeerConnection();
        sendMessage({type:'got user media', id:peer_id});
    }
        
}

function createPeerConnection(){
    console.log('createPeerConnection');    
    var peer;

    try{
        peer = new RTCPeerConnection(iceServers, pc_constraints);
        peer.onicecandidate = handleIceCandidate;       
    }catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }

    peer.onaddstream = handleRemoteStreamAdded;
    peer.onremovestream = handleRemoteStreamRemoved;
    peer.addStream(localStream);

    if(is_creator)
        createOffer(peer);

    return peer;
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
    if(is_creator)
        PC[index_pc].setLocalDescription(sessionDescription);
    else
        pc.setLocalDescription(sessionDescription);
    
    sendMessage(sessionDescription);
}

function createOffer (peer) {
    var offerOptions = {'offerToReceiveAudio':true,
                        'offerToReceiveVideo':true
                        };

    console.log('Sending offer to peer.');
    peer.createOffer(setLocalAndSendMessage, createOfferError, offerOptions);
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
    
    if (message.type === 'offer' && !offer_done) {
        console.log('offer received!');

        pc.setRemoteDescription(new RTCSessionDescription(message));
        createAnswer();
        offer_done = true;
    } 
    else if (message.type === 'answer' && is_creator) {
        console.log('answer received!');

        PC[index_pc].setRemoteDescription(new RTCSessionDescription(message));
    } 
    else if (message.type === 'candidate' && !candidate_done) {
        var candidate = new RTCIceCandidate({   
                sdpMLineIndex:message.label,
                candidate:message.candidate});

        if(is_creator)
            PC[index_pc].addIceCandidate(candidate);
        else
            pc.addIceCandidate(candidate);
    }
    else if(message.type === 'got user media' && is_creator){
        index_pc = message.id;
        PC[message.id] = createPeerConnection();
    }
    else if (message.type === 'bye' && is_creator) {
        handleRemoteHangup(message.id);
    }
});

socket.on('created', function (message){
    console.log(message);
    is_creator = true;
    GUM();
    peer_id = 0;
});

socket.on('joined', function (message){
    console.log(message.message);
    console.log('peer id: ' + message.id);
    peer_id = message.id;
    GUM();
});


socket.on('welcome', function (message){
    console.log(message);
});

window.onbeforeunload = function(e){
    if(is_creator)
        socket.emit('terminate', "0")

    pc.close();
    sendMessage({type:'bye', id:peer_id});
}