'use strict';

const express = require('express');
const cors = require('cors');
const pg = require('pg');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_URL = process.env.CLIENT_URL;

const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get('/', (req, res) => res.send('Testing 1, 2, 3'));

// gets all the books from BD.

app.get('/api/v1/books', (request, response) => {
  client.query(`
    SELECT book_id, title, author, image_url FROM books
    `
  )
    .then(result => response.send(result.rows))
    .catch(console.error);
});

// fecthing just one books

app.get('/api/v1/books/:id', (request, response) => {
  client.query(`
    SELECT book_id, title, author, isbn, image_url, description FROM books
    WHERE book_id=$1;`,
    [request.params.id]
  )
    .then(result => response.send(result.rows))
    .catch(console.error);
});

// adding a new book. had to install and use bodyParser

app.post('/api/v1/books', (request, response) => {
  client.query(
    'INSERT INTO books (title, author, isbn, image_url, description) VALUES($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
    [request.body.title, request.body.author, request.body.isbn, request.body.image_url, request.body.description],
    function(err) {
      if (err) console.error(err)
      response.send('insert complete');
    }
  )
});


///DATABASE LOADERS///

function loadBooks() {
  console.log('load books is starting')
  client.query('SELECT COUNT(*) FROM books')
    .then(result => {
      if(!parseInt(result.rows[0].count)) {
        fs.readFile('../Book-list-client/data/books.json', 'utf8', (err, fd) => {
          JSON.parse(fd).forEach(ele => {
            client.query(`
            INSERT INTO
            books(title, author, isbn, image_url, description)
            SELECT $1, $2, $3, $4, $5
          `,
              [ele.title, ele.author, ele.isbn, ele.image_url, ele.description]
            )
              .catch(console.error);
          })
        })
      }
    })
}

function loadDB() {
  client.query(`
    CREATE TABLE IF NOT EXISTS
    books (
      book_id SERIAL PRIMARY KEY,
      title VARCHAR,
      author VARCHAR,
      isbn VARCHAR,
      image_url VARCHAR,
      description TEXT
    );`
  )
    .then(loadBooks)
    .catch(console.error);
}

loadDB();

// this needs to be the last in the page
app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));
