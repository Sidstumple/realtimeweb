(function() {
  var socket = io();

  var html = {}
  var playlist = document.getElementById('playlist')
  var show = document.getElementById('show');
  var likes = document.getElementById('likes');


  socket.on('initiate songs', function (d) {
    console.log('Initiate songs');
    d.docs.map(function(obj){
      if (obj.song !== undefined) {
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
      var hearts = document.querySelectorAll('.like');
      hearts.forEach(function(ob) {
        console.log('HEARTSSSS');
        var heartId = document.getElementById(ob.id);
        console.log(heartId);
        heartId.addEventListener('click', function (event) {
          console.log(this, 'click');
          var art = this.parentNode.children[0].innerHTML;
          var son = this.parentNode.children[1].innerHTML;

          socket.emit('liked', {artist: art, song: son})
        })
      })
    })
    var id = d.docs;
    setInterval(function(){
      console.log('[CHEEECK]');
      socket.emit('check', id);
    }, 1000);
  })

  socket.on('add song', function (doc) {
    console.log('add a new user song');
    if (doc.user.song !== undefined) {
      playlist.innerHTML +=
      `<div class="info empty" id="${doc.user._id}">
        <div id="${doc.user._id}-image" class="image"><img src="${doc.user.albumImage}" alt=""></div>
        <div class="text">
          <p><strong>Artist: </strong> <span id="${doc.user._id}-artist">${doc.user.artist}</span></p>
          <p><strong>Song: </strong> <span id="${doc.user._id}-song">${doc.user.song}</span></p>
        </div>
        <div class="profile">
          <img src="${doc.user.profileImage}" alt="profile picture" class="profile-image">
          <p>${doc.user.userName}</p>
        </div>
        <div id="${doc.user._id}-like" class="like"></div>
      </div>`
    }
  })

  socket.on('update song', function(song) {
    console.log('song haz changed');
    console.log(song, '[SONG]');
    song.map(function(nu) {
      console.log(nu, '[nu]');
        playlist.innerHTML +=
        `<div class="info empty" id="${nu._id}">
        <div id="${nu._id}-image" class="image"><img src="${nu.albumImage}" alt=""></div>
        <div class="text">
        <p><strong>Artist: </strong> <span id="${nu._id}-artist">${nu.artist}</span></p>
        <p><strong>Song: </strong> <span id="${nu._id}-song">${nu.song}</span></p>
        </div>
        <div class="profile">
        <img src="${nu.profileImage}" alt="profile picture" class="profile-image">
        <p>${nu.userName}</p>
        </div>
        <div id="${nu._id}-like" class="like"></div>
        </div>`
        socket.emit('update all')
    })
    var hearts = document.querySelectorAll('.like');
    hearts.forEach(function(ob) {
      console.log('HEARTSSSS');
      var heartId = document.getElementById(ob.id);
      console.log(heartId);
      heartId.addEventListener('click', function (event) {
        console.log(this, 'click');
        var art = this.parentNode.children[0].innerHTML;
        var son = this.parentNode.children[1].innerHTML;

        socket.emit('liked', {artist: art, song: son})
      })
    })
  })

  socket.on('show likes', function(el) {
    console.log(el);
    el.likes.forEach(function (e) {
      console.log(e, 'show');
      var songdiv = `<div class="liked-song">${e}<div>`;

      likes.innerHTML += songdiv;

    })


  })
})();
