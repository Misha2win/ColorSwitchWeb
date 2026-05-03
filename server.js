const message = 'CSC-317 node/express app \n'
        + 'This uses nodeJS, express, and express.static\n'
        + 'to "serve" the files in the ./public/ dir!\n';

const express = require('express');
const app = express();
const port = process.env.PORT || 3123;
const host = process.env.HOST || '0.0.0.0';

const path = require('path');
const fs = require('fs/promises');
const staticDirectory = path.join(__dirname, 'public');

app.use(express.json({ limit: '1mb' }));

const levelsDirectory = path.join(staticDirectory, 'resources', 'levels');
const levelNamePattern = /^[A-Za-z0-9_-]+$/;

app.get('/api/levels', (req, res) => {
    res.json({ canOverwriteLevels: true });
});

app.put('/api/levels/:name', async (req, res) => {
    const name = req.params.name;
    if (!levelNamePattern.test(name)) {
        res.status(400).send('Level names can only contain letters, numbers, underscores, and hyphens.');
        return;
    }

    const levelJSON = req.body;
    if (!levelJSON || typeof levelJSON !== 'object' || Array.isArray(levelJSON)) {
        res.status(400).send('Request body must be a level JSON object.');
        return;
    }
    if (!levelJSON.color || !Array.isArray(levelJSON.entities)) {
        res.status(400).send('Level JSON must include color and entities[].');
        return;
    }

    const filePath = path.join(levelsDirectory, `${name}.json`);
    try {
        await fs.access(filePath);
        await fs.writeFile(filePath, `${JSON.stringify(levelJSON, null, 3)}\n`, 'utf8');
        res.json({ ok: true, path: `resources/levels/${name}.json` });
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.status(404).send(`Level ${name}.json does not exist. Use Save As New to download a new file.`);
            return;
        }

        console.error(err);
        res.status(500).send(`Could not save ${name}.json.`);
    }
});

app.use(express.static(staticDirectory));

app.listen(port, host, () => {
    console.log(`Listening on http://${host}:${port}/`);
});

console.log(message);
