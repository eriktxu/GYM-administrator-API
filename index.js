require('dotenv');
const express = require('express');
const cors = require('cors');
const app = express();
const clientesRoutes = require('./routes/cliente/client.routes');
const superadminRoutes = require('./routes/superadmin/superadmin.routes');
const gimnasioRoutes = require('./routes/gimnasio/gimnasio.routes');

app.use(cors());
app.use(express.json());

app.use('/api/clientes', clientesRoutes);
app.use('/api/gimnasio', gimnasioRoutes);
app.use('/api/superadmin', superadminRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);

});