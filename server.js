const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { ExpressPeerServer } = require('peer')
const peerServer = ExpressPeerServer(server, {
	debug: true,
})
const { v4: uuidv4 } = require('uuid')


let rooms = {}

app.use('/peerjs', peerServer)
app.use(express.static('public'))
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
	res.redirect(`/${uuidv4()}`)
})

app.get('/:room', (req, res) => {
	res.render('room', { roomId: req.params.room })
})

io.on('connection', (socket) => {
	socket.on('join-room', (roomId, userId, userName) => {
		console.log(roomId, userId, userName)
		socket.join(roomId)
		let users = rooms[`${roomId}`] !== undefined ? rooms[`${roomId}`] : []
		rooms = {
			...rooms,
			[`${roomId}`]: [...users, {
				userName: userName,
				userId: `${userId}`
			}]
		}
		socket.to(roomId).broadcast.emit('user-connected', userId, rooms[roomId])
		io.to(roomId).emit('all-users-joined', rooms[roomId])
		socket.on('message', (message) => {
			io.to(roomId).emit('createMessage', message, userId, userName)
		})
		socket.on('onUpdateUserName', (userName) => {
			let users = rooms[`${roomId}`] !== undefined ? rooms[`${roomId}`] : []
			const getUser = users.filter(obj => obj.userId === userId)
			let uObj = {
				userName,
				userId: `${userId}`
			}
			if (getUser.length === 1) uObj = {
				...uObj,
				userName,
			}
			rooms = {
				...rooms,
				[`${roomId}`]: [...users, uObj]
			}
			socket.to(roomId).broadcast.emit('onUpdateUserName', userId)
		})
		socket.on('onTyping', () => {
			socket.to(roomId).broadcast.emit('onTypingStart', userId, userName)
		})
		socket.on('onStopTyping', () => {
			socket.to(roomId).broadcast.emit('onStopTypingEnds', userId, userName)
		})
		socket.on('disconnect', () => {
			rooms = {
				...rooms,
				[`${roomId}`]: rooms[`${roomId}`].filter(obj => obj.userId !== `${userId}`)
			}
			io.to(roomId).emit('all-users-joined', rooms[`${roomId}`])
			socket.to(roomId).broadcast.emit('user-disconnected', userId)
		})
	})
	socket.on('all-users-joined', (roomId) => {
		io.to(roomId).emit('all-users-joined', rooms[roomId])
	})

})

const PORT = process.env.PORT || 5000

server.listen(PORT, () => console.log(`Listening on port ${PORT}`))
