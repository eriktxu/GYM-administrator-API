require('dotenv');
const express = require('express');
const cors = require('cors');
const app = express();
const clientesRoutes = require('./routes/cliente/client.routes');
const entrenadoresRoutes = require('./routes/entrenador/entrenador.routes')

app.use(cors());
app.use(express.json());

app.use('/api/clientes', clientesRoutes);
app.use('/api/entrenador', entrenadoresRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);

});