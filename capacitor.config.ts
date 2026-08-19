import type { CapacitorConfig } from "@capacitor/cli";

const productionUrl = process.env.CAPACITOR_SERVER_URL ?? "https://localprice.vercel.app";

const config: CapacitorConfig = {
  appId: "com.localprice.app",
  appName: "LocalPrice",
  webDir: "capacitor-www",
  server: {
    url: productionUrl,
    androidScheme: "https",
  },
};

export default config;
