import express from 'express';

const app = express();
const port = 3111;

app.get('/', (req, res) => {
    res.send('<p style="color: #fff">Welcome to a WebContainers app! 🥳</p>');
});

app.listen(port, () => {
    console.log(`App is live at http://localhost:${port}`);
});