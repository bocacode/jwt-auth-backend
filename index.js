import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { MongoClient } from 'mongodb'

const app = express()
app.use(cors())
app.use(express.json())

const client = new MongoClient(process.env.MONGO_URI)
client.connect()
console.log('Mongo Connected')

const database = client.db('jwt-auth-app')
const usersdb = database.collection('users')
const carsdb = database.collection('cars')

app.listen(4040, () => console.log('API listening on port 4040'))

app.post('/signup', async (req, res) => {
  // 1. get data from REQ
  console.log(req.body)
  const newUser = { email: req.body.email, password: req.body.password }

  // 2. hash password
  const hashedPassword = await bcrypt.hash(newUser.password, 10)

  // 3. save the new user in to DB
  await usersdb.insertOne({ email: newUser.email, password: hashedPassword })

  // 4. send something back to the requestor aka frontend
  res.status(201).send('User was added 👍')
})

app.post('/login', async (req, res) => {
  if (req.body.email && req.body.password) {
    // 1. get data from REQ
    const user = await usersdb.findOne({ email: req.body.email })
    console.log('user found', user)

    // 2. check the hashed password against the DB - Authentication
    const allowedUser = await bcrypt.compare(req.body.password, user.password)
    console.log(allowedUser)

    // 3. Create a JWT token for user - Authorization
    const accessToken = jwt.sign(user, process.env.SECRET_KEY)
    console.log(accessToken)

    // 4. Send something back to requestor aka frontend
    res.status(200).send({ accessToken: accessToken })
  } else {
    res.send('Hey you are not sending me email/password? what gives? ')
  }
})

app.get('/', async (req, res) => {
  // 1. get jwt token from REQ
  console.log(req.headers)
  const userToken = req.headers.authentication
  if (!userToken) res.send('sorry no token found, please log in again')

  // 2. check jwt token is ok
  jwt.verify(userToken, process.env.SECRET_KEY, async (err, decoded) => {
    console.log('decoded user', decoded)

    // 3. if token is ok then send list of users to REQ
    if (decoded) {
      const allUsers = await usersdb.find().toArray()
      res.status(200).send(allUsers)
    } else {
      res.send('sorry no token found, please log in again')
    }
  })
})

app.post('/add-car', async (req, res) => {
  // 1. get the req.body
  const userToken = req.headers.authentication
  if (!userToken) res.send('sorry no token found, please log in again')

  // 2. check the JWT token
  jwt.verify(userToken, process.env.SECRET_KEY, async (err, decoded) => {
    // 3. if token is good then add-car to DB
    if (decoded) {
      const date = new Date()
      await carsdb.insertOne({
        make: req.body.make,
        model: req.body.model,
        price: req.body.price,
        user: decoded.email,
        createdAt: date,
        sold: false,
      })
      res.send('Car was added Vroom Vroom 🚗🚗🚗🚗')
    }
  })
})
