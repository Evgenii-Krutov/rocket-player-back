const express = require('express');
const cors = require('cors');
const port = 3000;
const axios = require('axios');
const bodyParser = require("body-parser");
const Pool = require('pg').Pool;
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const SOUNDCLOUD_ID = process.env.SOUNDCLOUD_ID

const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT,
})

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

app.get('/', (_request, response) => {
  response.json({ info: 'Response from Rocket Player server' });
  response.end();
});

app.post('/search', async (request, response) => {
  const deezerArtists = await axios(`https://api.deezer.com/search/artist?q=${request.body.query}&limit=50`);
  const deezerAlbums = await axios(`https://api.deezer.com/search/album?q=${request.body.query}&limit=50`);
  const deezerTracks = await axios(`https://api.deezer.com/search/track?q=${request.body.query}&limit=50`);
  const soundcloudUsers =
    await axios(`https://api.soundcloud.com/users?q=${request.body.query}&limit=50&client_id=${SOUNDCLOUD_ID}`);
  const soundcloudPlaylists =
    await axios(`https://api.soundcloud.com/playlists?q=${request.body.query}&limit=50&client_id=${SOUNDCLOUD_ID}`);
  const soundcloudTracks =
    await axios(`https://api.soundcloud.com/tracks?q=${request.body.query}&limit=50&client_id=${SOUNDCLOUD_ID}`);
  const searchResults = {
    deezer: {
      artists: deezerArtists.data.data,
      albums: deezerAlbums.data.data,
      tracks: deezerTracks.data.data,
    },
    soundcloud: {
      users: soundcloudUsers.data,
      playlists: soundcloudPlaylists.data,
      tracks: soundcloudTracks.data,
    }
  }
  response.json(searchResults);
  response.end();
});

app.post('/getUser', async (request, response) => {
  const results = await axios(`https://api.deezer.com/user/me?access_token=${request.body.token}`);
  response.json(results.data);
  response.end();
});

app.post('/getGenre', async (request, response) => {
  const results = await axios(`https://api.deezer.com/genre/${request.body.id}`);
  response.json(results.data);
});

app.post('/getTrack', async (request, response) => {
  if (request.body.type && request.body.type === "deezer") {
    const results = await axios(`https://api.deezer.com/track/${request.body.trackId}`);
    response.json(results.data);
    response.end();
  }
  if (request.body.type && request.body.type === "soundcloud") {
    const results =
      await axios(`https://api.soundcloud.com/tracks/${request.body.trackId}?client_id=${SOUNDCLOUD_ID}`);
    response.json(results.data);
    response.end();
  }
});

app.post('/getAlbumTracks', async (request, response) => {
  const results = await axios(request.body.tracks);
  response.json(results.data);
  response.end();
});

app.post('/getArtistTracks', async (request, response) => {
  const results = await axios(request.body.tracks);
  response.json(results.data);
  response.end();
});

app.post('/createPlaylist', async (request, response) => {
  const duplicatedPlaylists =
    await pool.query('SELECT * FROM playlists WHERE name=$1 AND type=$2', [request.body.name, request.body.type]);
  if (!duplicatedPlaylists.rows.length) {
    await pool.query('INSERT INTO playlists (name, type) VALUES ($1, $2)', [request.body.name, request.body.type]);
  }
  response.end();
});

app.post('/getPlaylists', async (_request, response) => {
  const playlists = await pool.query('SELECT * FROM playlists');
  const typedPlaylists = createTypedPlaylists(playlists.rows);
  response.json(typedPlaylists);
  response.end();
});

app.post('/deletePlaylist', async (request, response) => {
  await pool.query('DELETE FROM playlists WHERE id=$1', [request.body.id]);
  response.end();
});

const createTypedPlaylists = (playlists) => {
  const deezerPlaylists = playlists.filter(playlist => playlist.type === "deezer");
  const soundcloudPlaylists = playlists.filter(playlist => playlist.type === "soundcloud");
  return {
    deezer: deezerPlaylists || [],
    soundcloud: soundcloudPlaylists || [],
  };
};

app.listen(port, () => {
  console.log(`App running on port ${port}.`)
});