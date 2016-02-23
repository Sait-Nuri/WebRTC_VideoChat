// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var SignallingServer = require('./signallingserver');
var webrtcSupport = require('webrtcsupport');
var mockconsole = require('mockconsole');
var port = process.env.PORT || 2013;



server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

var sigserv = new SignallingServer( null, io);

var client_num = 0;
var rooms = [];

// Emit welcome message on connection
io.on('connection', function(socket) {
    
	/*	Kullanıcı bağlandığında oda açar ya da var 
		olan odaya bağlanır */
	socket.on('join', function (room){
		 // Use socket to communicate with this particular client only, sending it it's own id
	    socket.emit('welcome', "welcome!");
	    //socket.broadcast.emit('message', "new client " + client_num +" connected");

		if( check_room(room, rooms) ){
			console.log("Request to join room");
			client_num++;
			socket.join(room);
			socket.emit('joined', {message:"You joined in " + room, id:client_num});

			//io.sockets.in(room).emit('peer_connected', "new client joined");
			
		}else{
			console.log("Request to create room");
			socket.join(room);
			rooms.push(room);
			socket.emit('created', "You created new room: " + room);

			//io.sockets.in(room).emit('message', "new room " + room + " created");
		}
	});

	socket.on('terminate', function (message) {
		if(message === '0'){
			console.log("Room is closed");
			rooms.pop();
			client_num = 0;
		}
		
	})

});

/*
belirtilen isimdeki (room) odanın mevcut olup olmadığına bakar
*/
var check_room = function(room, rooms){
	
	for (var i = 0; i < rooms.length; i++) {
    	if(room.localeCompare(rooms[i]) == 0){
			return true;
		}
    }

	return false;
}

