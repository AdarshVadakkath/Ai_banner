import { app } from './app';

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Formatly Backend API running at http://0.0.0.0:${PORT}`);
});
