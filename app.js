var request = require('request'); // 'Request' library
var querystring = require('querystring');
var env = require('dotenv').config();
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/data', function(err){
  if(err){
    console.log(err);
  }else{
    console.log('Connected to MongoDB');
  }
})

var userData = mongoose.Schema({
  userName: String,
  accessToken: String,
  profileImage: String,
  song: String,
  artist: String,
  albumImage: String,
  time: {type: Date, default: Date.now}
})

var user = mongoose.model('user', userData)

server.listen(process.env.PORT || 3000);
console.log('server listening on port 3000');

app.use('/static', express.static('./static'));

var client_id = process.env.CLIENT_ID; // Your client id
var client_secret = process.env.CLIENT_SECRET; // Your secret
var redirect_uri = process.env.REDIRECT_URI; // Your redirect uri
var connections = [];
// var newUser;

// set the view engine to ejs
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    res.render('index');
})

app.get('/login', function(req, res) {
  //It's necessary to encode the permissions string to allow for scopes like channels:read
  var permissions = encodeURIComponent('client');

  console.log('serving Spotify button with permissions: ' + permissions);
  console.log('new instance');
  var scope = 'user-read-private user-read-email user-read-currently-playing user-read-playback-state user-read-recently-played user-modify-playback-state';

  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri
    })
  );
});

app.get('/callback', function(req, res) {
  var code = req.query.code;

  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
    },
    json: true
  };
  // use the access token to access the Spotify Web API
  request.post(authOptions, function(error, response, body) {
    var access_token = body.access_token;
    var refresh_token = body.refresh_token;
    newUser = new user({accessToken: access_token})
    newUser.save(function(err) {
      if(err) throw err;
    })

    console.log("[NEW ACCESSTOKEN] added");

    res.redirect('/whatsplaying');
  });
});

app.get('/whatsplaying', function(req, res) {
  if (newUser.accessToken !== undefined){
    res.render('whatsplaying');
    var profile = {
      url: 'https://api.spotify.com/v1/me/',
      headers: { 'Authorization': 'Bearer ' + newUser.accessToken },
      json: true
    }

    request.get(profile, function(error, response, profile) {
      console.log(profile.display_name);
      if(profile.display_name == null){
        newUser = new user({userName: profile.id})
        newUser.save(function(err) {
          if(err) throw err;
        })
      } else {
        newUser = new user({userName: profile.display_name})
        newUser.save(function(err) {
          if(err) throw err;
        })
      }
      if (profile.images !== '') {
        profile.images.map(function (obj) {
          console.log('///////////////[NEW USER DATA]');
          newUser = new user({profileImage: obj.url})
          newUser.save(function(err) {
            if(err) throw err;
          })
        })
      }
      console.log(newUser, '///////////////<<<<><><><><><');
    })
  } else {
    console.log('no access token for the selected scope yet.');
    res.redirect('/');
  }
})

io.on('connection', function(socket) {
  console.log(newUser.accessToken);
  var newUser;
  if(newUser.accessToken !== undefined) {
    // console.log(Object.keys(userData));
    var options = {
      url: 'https://api.spotify.com/v1/me/player/currently-playing',
      headers: { 'Authorization': 'Bearer ' + newUser.accessToken },
      json: true
    }
    request.get(options, function(error, response, body) {
      if(body.item.album.images !== undefined) {
        newUser = new user({albumImage: body.item.album.images[2].url, song: body.item.name})
        newUser.save(function(err) {
          if(err) throw err;
        })

        body.item.artists.map(function (obj) {
          newUser = new user({artist: obj.name})
          newUser.save(function(err) {
            if(err) throw err;
          })
        })
      }
      console.log(newUser);
      socket.emit('start', {users: newUser});
    });
  }

  setInterval(function(){
    socket.emit('check song')
  }, 1000);

  connections.push(socket);
  console.log('Connected: %s sockets connected', connections.length);
  // Disconnect
  socket.on('disconnect', function(data){
    connections.splice(connections.indexOf(socket), 1);
    console.log('Disconnected: %s sockets connected', connections.length);
  });

  socket.on('like', function(target) {
    socket.emit('liked', {target: target.id});
  })
  // Checks if a new song is played:
  socket.on('next song', function(data) {
    Object.keys(userData).forEach(function(key){
      var options = {
        url: 'https://api.spotify.com/v1/me/player/currently-playing',
        headers: { 'Authorization': 'Bearer ' + newUser.accessToken },
        json: true
      }

      request.get(options, function(error, response, body) {
        // console.log(body);
        newUser = new user({albumImage: body.item.album.images[2].url, song: body.item.name})
        newUser.save(function(err) {
          if(err) throw err;
        })
        var storedSong = newUser.song;
        var storedArtist = newUser.artist;
        var newSong = body.item.name;
        userData[key].newArtist = '';
        body.item.artists.map(function(obj){
          userData[key].newArtist += `${obj.name} `;
        })

        console.log(userData[id].newArtist);
        console.log('//////////');
        console.log("[UPDATE] song");
        userData[key].albumImage = body.item.album.images[2].url;
        userData[key].song = body.item.name;
        userData[key].artist = '';

        body.item.artists.map(function (obj) {
          userData[key].artist += `${obj.name} `;
        })
        console.log(userData);
        socket.emit('update song', {users: userData});
    console.log('Check if a new song is played');
  })
});
});
});
