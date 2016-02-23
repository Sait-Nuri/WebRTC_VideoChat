
function SignallingServer(opts, io){
	var _options = opts || {};
	var _io = io;

	_io.on('connection', function(socket){
		
		//Tüm clientlere mesaj gönderir.
		socket.on('message', function(msg){
			socket.broadcast.emit('message', msg);
		});

		//belirtilem id'deki cliente mesaj gönderir.
		socket.on('private_message', function(id, msg){
			socket.broadcast.to(id).emit('my message', msg);
		});

	});
};

module.exports = SignallingServer;
	/*
	 // sending to sender-client only
	 socket.emit('message', "this is a test");

	 // sending to all clients, include sender
	 io.emit('message', "this is a test");

	 // sending to all clients except sender
	 socket.broadcast.emit('message', "this is a test");

	 // sending to all clients in 'game' room(channel) except sender
	 socket.broadcast.to('game').emit('message', 'nice game');

	 // sending to all clients in 'game' room(channel), include sender
	 io.in('game').emit('message', 'cool game');

	 // sending to sender client, only if they are in 'game' room(channel)
	 socket.to('game').emit('message', 'enjoy the game');

	 // sending to all clients in namespace 'myNamespace', include sender
	 io.of('myNamespace').emit('message', 'gg');

	 // sending to individual socketid
	 socket.broadcast.to(socketid).emit('message', 'for your eyes only');

	*/

/*
Signaling gotchas

RTCPeerConnection won't start gathering candidates until setLocalDescription() is called: this is mandated in the JSEP IETF draft.
Take advantage of Trickle ICE (see above): call addIceCandidate() as soon as candidates arrive.

*/