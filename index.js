var fs = require('fs-extra');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var pty = require('pty.js');

app.get('/', function(req, res) { res.sendFile(__dirname + "/index.html"); });

io.on('connection', function(socket) {
  console.log('user connected');

  socket.on('disconnect', function() {
    if(qemu) qemu.kill();
    console.log('user disconnected');
  });

  var qemu = (function setupQEMU() {
    var q = pty.spawn('qemu-system-i386',
      ['-curses',
       '-kernel', 'vmlinuz',
       '-initrd', 'core.gz',
       '--append', 'superuser quiet',
       '-m', '48',
       '-net', 'none'],
      {
        name: 'vt100',
        cols: 80,
        rows: 25,
        cwd: process.env.PWD,
        env: process.env
      });

    q.on('data', function(data) {
      socket.emit('stdout', data);
    });

    q.on('exit', function() { qemu = setupQEMU(); });

    return q;
  })();

  socket.on('stdin', function(data) {
    if(typeof(data) != 'object') return;
    if(typeof(data.keyCode) != 'number') return;

    switch(data.keyCode) {
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
      case 220: // Backslash
        qemu.write("\\");
        break;
      case 191: // Forward slash
        qemu.write("/");
        break;
      case 190: // Period / right angle bracket
        if(data.shiftKey) {
          qemu.write('>');
        } else {
          qemu.write('.');
        }
        break;
      case 189: // Dash
        qemu.write('-');
        break;
      case 186: // (semi) colon
        if(data.shiftKey) {
          qemu.write(':');
        } else {
          qemu.write(';');
        }
        break;
      default:
        if(data.shiftKey) {
          qemu.write(String.fromCharCode(data.keyCode));
        } else {
          qemu.write(String.fromCharCode(data.keyCode).toLowerCase());
        }
    }
  });
});

http.listen(3000, function() {
  console.log('listening on port 3000...');
});
