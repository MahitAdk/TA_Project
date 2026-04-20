import { config } from "@dotenvx/dotenvx";

config();

import app from "./app.js";

const requestedPort = Number(process.env.PORT);
const PORT =
  Number.isInteger(requestedPort) && requestedPort > 0 && requestedPort !== 5173
    ? requestedPort
    : 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
