module.exports = {
  apps: [
    {
      name: "neuroclip-api",
      script: "./dist/index.mjs",
      cwd: "/home/deploy/projects/neuroclip/artifacts/api-server",
      time: true,
      node_args: "--env-file=/home/deploy/projects/neuroclip/.env",
    },
  ],
};
