(function() {
  var socket = io();

  var html = {}
  var playlist = document.getElementById('playlist')
  var play = document.getElementById('play');

  socket.on('new user', function(user){
    console.log(user, '[USER]');
    playlist.innerHTML +=
    `<div class="info empty" id="${user._id}">
      <div id="${user._id}-image" class="image"><img src="${user.albumImage}" alt=""></div>
      <div class="text">
        <p><strong>Artist: </strong> <span id="${user._id}-artist">${user.artist}</span></p>
        <p><strong>Song: </strong> <span id="${user._id}-song">${user.song}</span></p>
      </div>
      <div class="profile">
        <img src="${user.profileImage}" alt="profile picture" class="profile-image">
        <p>${user.userName}</p>
      </div>
      <div id="${user._id}-like" class="like"></div>
    </div>`
    console.log(playlist, '[PLAYLIST]');
    setInterval(function(){
      console.log('[CHEEECK]');
      socket.emit('check', user._id);
    }, 7000);
  })

  socket.on('all songs', function (docs) {
    console.log(docs, '[should be an object]');
    playlist = '';

    docs.map(function(obj){
      if (obj.song !== undefined) {
        console.log('It haz works');
        playlist.innerHTML +=
        `<div class="info empty" id="${obj._id}">
          <div id="${obj._id}-image" class="image"><img src="${obj.albumImage}" alt=""></div>
          <div class="text">
            <p><strong>Artist: </strong> <span id="${obj._id}-artist">${obj.artist}</span></p>
            <p><strong>Song: </strong> <span id="${obj._id}-song">${obj.song}</span></p>
          </div>
          <div class="profile">
            <img src="${obj.profileImage}" alt="profile picture" class="profile-image">
            <p>${obj.userName}</p>
          </div>
          <div id="${obj._id}-like" class="like"></div>
        </div>`
      }
    })
  })

  socket.on('check', function() {
    socket.emit('check song');
    console.log('[CHEEECK]');
  })

  socket.on('new song', function(docs) {
    console.log(docs);
    console.log('new song');
    docs.map(function(obj){
      console.log(obj);
      playlist = '';
      if (obj.song !== undefined) {
        console.log('put it in a zakje');
        playlist.innerHTML +=
        `<div class="info empty" id="${obj._id}">
          <div id="${obj._id}-image" class="image"><img src="${obj.albumImage}" alt=""></div>
          <div class="text">
            <p><strong>Artist: </strong> <span id="${obj._id}-artist">${obj.artist}</span></p>
            <p><strong>Song: </strong> <span id="${obj._id}-song">${obj.song}</span></p>
          </div>
          <div class="profile">
            <img src="${obj.profileImage}" alt="profile picture" class="profile-image">
            <p>${obj.userName}</p>
          </div>
          <div id="${obj._id}-like" class="like"></div>
        </div>`
      }
    })
  })

})();
