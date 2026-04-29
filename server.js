const message = 'CSC-317 node/express app \n'
        + 'This uses nodeJS, express, and express.static\n'
        + 'to "serve" the files in the ./public/ dir!\n';

const express = require('express');
const app = express();
const port = process.env.PORT || 3123;
const host = process.env.HOST || '0.0.0.0';

const path = require('path');
const staticDirectory = path.join(__dirname, 'public');
app.use(express.static(staticDirectory));

app.listen(port, host, () => {
    console.log(`Listening on http://${host}:${port}/`);
});

console.log(message);