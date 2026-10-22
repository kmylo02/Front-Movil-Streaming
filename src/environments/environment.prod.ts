export const environment = {
  production: true,
  // Backend principal en Railway (dominio propio)
  apiUrl: 'https://service-mundostream.kodivo.es/api',
  // Respaldo automatico (Render) si el principal no responde.
  // Quitar cuando Railway este estable y se apague Render.
  apiUrlBackup: 'https://back-streaming-75se.onrender.com/api',
};
