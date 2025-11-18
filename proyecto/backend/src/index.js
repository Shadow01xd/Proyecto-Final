import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI

app.use(cors())
app.use(express.json())

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment variables')
  process.exit(1)
}

mongoose
  .connect(MONGODB_URI, { dbName: 'novatech' })
  .then(() => {
    console.log('MongoDB connected')
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  })

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'backend', db: 'connected' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
