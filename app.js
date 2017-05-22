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
  current: {song: String, artist: String},
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
    var newUser = new user({accessToken: access_token})
    newUser.save(function(err) {
      if(err) throw err;
    })

    console.log("[NEW ACCESSTOKEN] added");

    res.redirect('/whatsplaying');

    console.log(newUser, '///////////////<<<<><><><><><');
  });
});

app.get('/whatsplaying', function(req, res) {
  if (newUser.accessToken !== 'undefined'){
    res.render('whatsplaying');
    var profile = {
      url: 'https://api.spotify.com/v1/me/',
      headers: { 'Authorization': 'Bearer ' + newUser.accessToken },
      json: true
    }

    request.get(profile, function(error, response, profile) {
      console.log(profile.display_name);
      if(profile.display_name == null){
        newUser.name = profile.id;
      } else {
        newUser.userName = profile.display_name;
      }
      // newUser._id = profile.id;

      if (profile.images !== '') {
        profile.images.map(function (obj) {
          console.log('///////////////[NEW USER DATA]');
          newUser.profileImage = obj.url;
        })
      }
    })
  } else {
    console.log('no access token for the selected scope yet.');
    res.redirect('/');
  }
})
