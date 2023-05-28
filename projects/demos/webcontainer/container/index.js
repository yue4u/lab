import express from 'express';

const app = express();
const port = 3111;

app.get('/', (req, res) => {
    res.send(`
<head>
  <style>
  body {
      display: grid;
      place-items: center;
  }
  p {
      font-size: 2rem;
      color: #fff;
      text-align: center;
  }
  </style>
</head>
<body>
  <p>Welcome to a WebContainers app! 🥳</p>
</body>
`);
});

app.listen(port, () => {
    console.log(`App is live at http://localhost:${port}`);
});