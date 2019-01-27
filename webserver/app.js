const express = require('express')
const path = require('path')
const app = express()

const port = process.env.PORT || 3000

// app.get('/', (req, res) => res.send('Hello World!'))

app.use(express.static('client'))
// app.use(express.static(path.join(__dirname, 'client')))

app.listen(port, () => console.log(`Example app listening on port ${port}!`))