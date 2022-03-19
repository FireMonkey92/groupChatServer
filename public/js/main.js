const socket = io('/')
const videoGrid = document.getElementById('videoGrid')
const localStream = document.getElementById('local-stream')
const myVideo = document.createElement('video')
const myName = 'Host Name'
let myUserId = ""
myVideo.muted = true

var peer = new Peer()
const myPeer = new Peer(undefined, {
	path: '/peerjs',
	host: '/',
	port: '5000',
})

const peers = {}
let myVideoStream
// Initialize RecordApi
if (!navigator.getUserMedia)
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia || navigator.msGetUserMedia;
navigator.mediaDevices
	.getUserMedia({
		video: true,
		audio: true,
	})
	.then((stream) => {
		myVideoStream = stream
		const video = document.createElement('video')
		video.srcObject = stream
		video.addEventListener('loadedmetadata', () => {
			video.play()
		})



		localStream.append(video)

		socket.on('user-connected', (userId, roomDetails) => {
			connectToNewUser(userId, stream)
		})

		peer.on('call', (call) => {
			call.answer(stream)
			const video = document.createElement('video')
			call.on('stream', (userVideoStream) => {
				addVideoStream(video, userVideoStream)
			})
		})

		let text = $('input')

		$('html').keydown(function (e) {
			if (e.which == 13 && text.val().length !== 0) {
				socket.emit('message', text.val())
				text.val('')
			}
		})

		$("#chatMessage").keyup(function () {
			setTimeout(() => {
				socket.emit('onStopTyping');
			}, 2000);
		});

		$("#chatMessage").keydown(function () {
			socket.emit('onTyping');
		});

		$("#chatMessage").focusin(function () {
			socket.emit('onTyping');
		});

		$("#chatMessage").focusout(function () {
			socket.emit('onStopTyping');
		});


		socket.on('onTypingStart', async (userId, userName) => {
			await $('.isTyping').empty().append(`${userName} is typing`).addClass("show")
		})
		socket.on('onStopTypingEnds', async (userId) => {
			await $('.isTyping').removeClass("show")
		})

		socket.on('createMessage', (message, userId, userName) => {
			$('ul').append(`<li >
								<span class="messageHeader">
									<span>
										From 
										<span class="messageSender">${userName}</span> 
										to 
										<span class="messageReceiver">Everyone:</span>
									</span>

									${new Date().toLocaleString('en-US', {
				hour: 'numeric',
				minute: 'numeric',
				hour12: true,
			})}
								</span>

								<span class="message">${message}</span>
							
							</li>`)
			scrollToBottom()
		})
	})

socket.on('user-disconnected', (userId) => {
	if (peers[userId]) peers[userId].close()
})

socket.on('all-users-joined', (roomDetails) => {
	console.log("roomDetails", roomDetails)
	const fL = roomDetails.filter(o => o.userId !== myUserId)
	let options = `<option value="0"><span>Everyone</span></option>`
	if (fL && fL.length > 0) {
		fL.map(op => {
			options += `<option value="${op.userId}"><span>${op.userName}</span></option>`
		})
	}
	$('#all_users').empty()
	$('#all_users').append(options)
})

peer.on('open', (id) => {
	var userName = prompt("Please enter your name", myName);
	if (userName != null) {
		myUserId = id
		socket.emit('join-room', ROOM_ID, id, userName)
		socket.emit('all-users-joined', ROOM_ID, id)
	}
	console.log(peers)
})

peer.on('close', () => {
	socket.emit('disconnect')
})

const connectToNewUser = (userId, stream) => {
	const call = peer.call(userId, stream)
	const video = document.createElement('video')
	call.on('stream', (userVideoStream) => {
		addVideoStream(video, userVideoStream)
	})
	call.on('close', () => {
		video.remove()
	})
	peers[userId] = call
}

const addVideoStream = (video, stream) => {
	video.srcObject = stream
	video.addEventListener('loadedmetadata', () => {
		video.play()
	})
	videoGrid.append(video)
}

const scrollToBottom = () => {
	var d = $('.mainChatWindow')
	d.scrollTop(d.prop('scrollHeight'))
}

const muteUnmute = () => {
	const enabled = myVideoStream.getAudioTracks()[0].enabled
	if (enabled) {
		myVideoStream.getAudioTracks()[0].enabled = false
		setUnmuteButton()
	} else {
		setMuteButton()
		myVideoStream.getAudioTracks()[0].enabled = true
	}
}

const setMuteButton = () => {
	const html = `
	  <i class="fas fa-microphone"></i>
	  <span>Mute</span>
	`
	document.querySelector('.mainMuteButton').innerHTML = html
}

const setUnmuteButton = () => {
	const html = `
	  <i class="unmute fas fa-microphone-slash"></i>
	  <span>Unmute</span>
	`
	document.querySelector('.mainMuteButton').innerHTML = html
}

const playStop = () => {
	console.log('object')
	let enabled = myVideoStream.getVideoTracks()[0].enabled
	if (enabled) {
		myVideoStream.getVideoTracks()[0].enabled = false
		setPlayVideo()
	} else {
		setStopVideo()
		myVideoStream.getVideoTracks()[0].enabled = true
	}
}

const setStopVideo = () => {
	const html = `
	  <i class="fas fa-video"></i>
	  <span>Stop</span>
	`
	document.querySelector('.mainVideoButton').innerHTML = html
}

const setPlayVideo = () => {
	const html = `
	<i class="stop fas fa-video-slash"></i>
	  <span>Play</span>
	`
	document.querySelector('.mainVideoButton').innerHTML = html
}

const toggleChat = () => {
	$('.mainRight').toggleClass('show');
	const mhtml = `
	<i class="stop fas fa-comment-alt"></i>
	  <span>Chat</span>`;
	const html = `<i class="fas fa-comment-alt"></i>
	  <span>Chat</span>`
	document.querySelector('.mainChatButton').innerHTML = $('.mainRight').hasClass("show") ? mhtml : html
}

const endChat = () => {
	if (window.confirm("Are you sure want to leave this meeting? ")) {
		socket.emit('disconnect')
		window.location.replace(location.origin)
	}
}