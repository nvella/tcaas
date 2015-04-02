var fs = require('fs-extra');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var pty = require('pty.js');

app.get('/', function(req, res) { res.sendFile(__dirname + "/index.html"); });

io.on('connection', function(socket) {
  console.log('user connected');

  socket.on('disconnect', function() {
    qemu.kill();
    console.log('user disconnected');
  });

  var qemu = pty.spawn('qemu-system-i386',
    ['-curses',
     '-kernel', 'vmlinuz',
     '-initrd', 'core.gz',
     '--append', 'superuser quiet',
     '-m', '48'],
    {
      name: 'vt100',
      cols: 80,
      rows: 25,
      cwd: process.env.PWD,
      env: process.env
    });

  qemu.on('data', function(data) {
    socket.emit('stdout', data);
  });

  socket.on('stdin', function(data) {
    if(typeof(data) != 'number') return;
    switch(data) {
      case 37:
        qemu.write(String.fromCharCode(27) + "[D");
        break;
      case 38:
        qemu.write(String.fromCharCode(27) + "[A");
        break;
      case 39:
        qemu.write(String.fromCharCode(27) + "[C");
        break;
      case 40:
        qemu.write(String.fromCharCode(27) + "[B");
        break;
      case 220:
        qemu.write("\\");
        break;
      case 191:
        qemu.write("/");
        break;
      default:
        qemu.write(String.fromCharCode(data));
    }
  });
});

http.listen(3000, function() {
  console.log('listening on port 3000...');
});
