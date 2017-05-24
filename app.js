var request = require('request'); // 'Request' library
var querystring = require('querystring');
var env = require('dotenv').config();
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var mongoose = require('mongoose');

var Schema = mongoose.Schema;


mongoose.connect(process.env.MONGO, function(err){
  if(err){
    console.log(err);
    console.log('no connection');
  }else{
    console.log('Connected to MongoDB');
  }
})

var userSchema = new Schema({
  _id: String,
  socketId: String,
  accessToken: String,
  userName: String,
  profileImage: String,
  song: String,
  newSong: String,
  artist: String,
  newArtist: String,
  albumImage: String,
  liked: Array
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

// console.log(userSchema.accessToken == undefined, '[IS THIS TRUE?]');

// set the view engine to ejs
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    res.render('index');
})

app.get('/login', function(req, res) {
  //It's necessary to encode the permissions string to allow for scopes like channels:read
  var permissions = encodeURIComponent('client');

  console.log('serving Spotify button with permissions: ' + permissions);
  // console.log('new instance');
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
    // userSchema.accessToken = access_token;
    userSchema.save(function(err){
      if (err) {
        return err
      }else {
        console.log('accessToken saved');
      }
    })

    // console.log(userSchema);
    console.log("[NEW ACCESSTOKEN] added");


    res.redirect('/whatsplaying');
  });
});

app.get('/whatsplaying', function(req, res) {
  if (userSchema.accessToken !== undefined) {
    res.render('whatsplaying');
    var profile = {
      url: 'https://api.spotify.com/v1/me/',
      headers: { 'Authorization': 'Bearer ' + userSchema.accessToken },
      json: true
    }

    request.get(profile, function(error, response, profile) {
      userSchema._id = profile.id;
      if(profile.display_name == null){
        userSchema.userName = profile.id;
      } else {
        userSchema.userName = profile.display_name;
      }
      profile.images.map(function (obj) {
        console.log('///////////////[NEW USER DATA]');
        if (obj.url !== undefined) {
          userSchema.profileImage = obj.url;
        } else {
          userSchema.profileImage = 'http://cydstumpel.nl/img/hva.jpg';
        }
      })
      userSchema.save(function(err){
        if (err) {
          return err
        }else {
          console.log('Profile saved');
        }
      })
    })
  } else {
    console.log('no access token for the selected scope yet.');
    res.redirect('/');
  }
})

io.on('connection', function(socket) {
  connections.push(socket);
  console.log('Connected: %s sockets connected', connections.length);
  // Disconnect
  socket.on('disconnect', function(data){
    //remove user's data when no users are connected.
    connections.splice(connections.indexOf(socket), 1);
    console.log('Disconnected: %s sockets connected', connections.length);
    console.log(connections.length);
    if (connections.length == 0) {
      console.log('ZERO sockets connected, delete database');
      user.find({}).remove().exec();
    }
  });

  user.find({}, function(err, docs){
    // console.log(docs, '[DOCS!!!!]' );
    if(err) throw err;
    socket.emit('initiate songs', {docs: docs});
  })


  setTimeout(function() {
      if(userSchema._id !== undefined){
        console.log(userSchema._id, 'hello');
        var query = {'_id': userSchema._id};
        user.update(query, {
          '$set':{
            socketId: socket.id
          }
        }, {upsert:true}, function(err, doc){
          if(err) console.log(err);
          // console.log(doc);
        });
      }

      user.find({socketId: socket.id}, function(err, docs){

        docs.map(function (ob) {
          console.log(ob.liked == undefined, '[IS THIS TRUE?]');
          if (ob.liked !== '') {
            console.log('Getting liked songs');
            var likes = ob.liked;
            socket.emit('get liked songs', likes);
          }

          if (userSchema.accessToken == undefined) {
            console.log('redirecting to login');
            var destination = '/';
            socket.emit('redirect', destination)
          } else {
            // get username and current song info
            user.find({socketId: socket.id}, function(err, docs){
              docs.map(function (ob) {
                var options = {
                  url: 'https://api.spotify.com/v1/me/player/currently-playing',
                  headers: { 'Authorization': 'Bearer ' + ob.accessToken },
                  json: true
                }

                request.get(options, function(error, response, body) {
                  if(body.item !== undefined) {
                    ob.albumImage = body.item.album.images[2].url;
                    ob.song = body.item.name;

                    body.item.artists.map(function (obj) {
                      ob.artist = obj.name;
                      userSchema.save(user, function(err) {
                        if(err) console.log(err);
                      })
                    })
                  }
                });
                socket.emit('add song', {user: userSchema});
              })
            })
          }
        })
      })
  },500);

  socket.on('check', function () {
      user.find({socketId: socket.id}, function(err, docs){
        if(err) console.log(err);

        docs.map(function (nu) {
          var options = {
            url: 'https://api.spotify.com/v1/me/player/currently-playing',
            headers: { 'Authorization': 'Bearer ' + nu.accessToken },
            json: true
          }
          request.get(options, function(error, response, body) {
            if(body.item == null) {
              console.log(body.item, 'BODYYYY');
              console.log('Redirect: spotify ad or user has no accessToken');
              var destination = '/';
              socket.emit('redirect', destination)
            } else {
              nu.newSong = body.item.name;
              if(nu.newSong !== nu.song) {
                console.log('new Song');
                nu.albumImage = body.item.album.images[2].url;
                nu.song = body.item.name;

                body.item.artists.map(function (obj) {
                  nu.artist = obj.name;
                  nu.save(user, function(err) {
                    if(err) throw err;
                  })
                })
                // console.log(docs);
                io.sockets.emit('update song', docs)
              } else {
                // console.log('same song');
              }
            }
        })
      })
    })
  });

  socket.on('liked', function(info) {
    user.find({socketId: socket.id}, function(err, docs){
      if(err) console.log(err);
      docs.map(function(s) {
        var newLike = {img: info.image, song: info.song};
        console.log(info.image);

        s.liked.push(newLike);
        s.save(function (err) {
          if (err) console.log(err);
          socket.emit('show likes', s)
        })
      })
    })
  })
  console.log(userSchema.liked);
});
