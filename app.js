var request = require('request'); // 'Request' library
var querystring = require('querystring');
var env = require('dotenv').config();
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var mongoose = require('mongoose');

var Schema = mongoose.Schema;

mongoose.connect('mongodb://localhost/data', function(err){
  if(err){
    console.log(err);
  }else{
    console.log('Connected to MongoDB');
  }
})

var userSchema = new Schema({
  accessToken: String,
  userName: String,
  profileImage: String,
  song: String,
  newSong: String,
  artist: String,
  newArtist: String,
  albumImage: String,
  time: {type: Date, default: Date.now}
})

var user = mongoose.model('user', userSchema);

app.get('/users', function (req, res) {
  mongoose.model('user').find(function(err, users) {
    res.send(users);
  })
})

server.listen(process.env.PORT || 3000);
console.log('server listening on port 3000');

app.use('/static', express.static('./static'));

var client_id = process.env.CLIENT_ID; // Your client id
var client_secret = process.env.CLIENT_SECRET; // Your secret
var redirect_uri = process.env.REDIRECT_URI; // Your redirect uri
var connections = [];
// var userSchema;

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
    userSchema = new user({accessToken: access_token})
    console.log(userSchema);
    console.log("[NEW ACCESSTOKEN] added");

    res.redirect('/whatsplaying');
  });
});

app.get('/whatsplaying', function(req, res) {
  if (userSchema.accessToken !== undefined){
    res.render('whatsplaying');
    var profile = {
      url: 'https://api.spotify.com/v1/me/',
      headers: { 'Authorization': 'Bearer ' + userSchema.accessToken },
      json: true
    }

    request.get(profile, function(error, response, profile) {
      if(profile.display_name == null){
        userSchema.userName = profile.id;
      } else {
        userSchema.userName = profile.display_name;
      }
      if (profile.images !== '') {
        profile.images.map(function (obj) {
          console.log('///////////////[NEW USER DATA]');
          userSchema.profileImage = obj.url;
        })
      }

      var options = {
        url: 'https://api.spotify.com/v1/me/player/currently-playing',
        headers: { 'Authorization': 'Bearer ' + userSchema.accessToken },
        json: true
      }
      request.get(options, function(error, response, body) {
        userSchema.albumImage = body.item.album.images[2].url;
        userSchema.song = body.item.name;

        body.item.artists.map(function (obj) {
          userSchema.artist = obj.name;
          userSchema.save(user, function(err) {
            if(err) throw err;
          })
        })
      });

      console.log(userSchema, '///////////////<<<<><><><><><');
    })
  } else {
    console.log('no access token for the selected scope yet.');
    res.redirect('/');
  }
})

io.on('connection', function(socket) {
  user.find({}, function(err, docs){
    console.log(docs);
    if(err) throw err;
    socket.emit('all songs', docs);
  })

  socket.emit('new user', userSchema);

  connections.push(socket);
  console.log('Connected: %s sockets connected', connections.length);
  // Disconnect
  socket.on('disconnect', function(data){
    connections.splice(connections.indexOf(socket), 1);
    console.log('Disconnected: %s sockets connected', connections.length);
  });

  socket.on('check', function (id) {
    console.log(id);
    // console.log('check');
    var options = {
      url: 'https://api.spotify.com/v1/me/player/currently-playing',
      headers: { 'Authorization': 'Bearer ' + userSchema.accessToken },
      json: true
    }
    request.get(options, function(error, response, body) {
      user.find({_id: id}, function(err, u){
        if(err) throw err;

        u.map(function(obj) {
          obj.newSong = body.item.name;
          if (obj.song !== obj.newSong) {
            console.log('new song');
            obj.albumImage = body.item.album.images[2].url;
            obj.song = obj.newSong;

            body.item.artists.map(function (a) {
              obj.artist = a.name;
              userSchema.save(user, function(err) {
                if(err) throw err;
              })
            })
          socket.emit('update song', obj);
          }
        })

      })
    });
  });
});
