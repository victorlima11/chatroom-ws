import http from 'http';
import { app } from './server';
import { setupSocket } from './socket';

const PORT = process.env.PORT;

const server = http.createServer(app);
setupSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
