import { createFileRoute } from "@tanstack/react-router";
import brands from "../../../../data/smartphone-db/brands.json";
import chipsets from "../../../../data/smartphone-db/chipsets.json";
import devices from "../../../../data/smartphone-db/devices.json";
import gameCompatibility from "../../../../data/smartphone-db/game_compatibility.json";

// Serves the bundled smartphone dataset used by the admin "sync database" tool.
export const Route = createFileRoute("/api/admin/dataset")({
  server: {
    handlers: {
      GET: async () => Response.json({ brands, chipsets, devices, gameCompatibility }),
    },
  },
});
