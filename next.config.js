module.exports = {
	// ...existing config (if any)...
	async rewrites() {
		return [
			{
				source: "/api/:path*",
				destination: "http://localhost:3001/api/:path*", // proxy to backend to avoid CORS in dev
			},
		];
	},
};
