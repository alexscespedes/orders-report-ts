import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const PORT = 3000;

createServer(async (req, res) => {
  switch (req.url) {
    case "/orders.json": {
      const body = await readFile("data/orders.json", "utf-8");
      res.writeHead(200, { "Content-Type": "application/json" }).end(body);
      break;
    }
    case "/bad-json":
      res
        .writeHead(200, { "Content-Type": "application/json" })
        .end("{ not valid json");

    case "/slow":
      setTimeout(() => res.writeHead(200).end("[]"), 10_000);
      break;
    case "/error-500":
      res.writeHead(500).end("Internal Server Error");
      break;
    default:
      res.writeHead(404).end("Not Found");
  }
}).listen(PORT, () => console.log(`Dev server on http://localhost:${PORT}`));
