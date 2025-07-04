require('dotenv');
const express = require('express');
const app = express();
const clientRoutes = require('./routes/client.routes');

app.use(express.json());

app.use('/api/clients', clientRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Servidor en http://localhost:${PORT}');
});