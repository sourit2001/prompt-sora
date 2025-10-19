export default function handler(req, res) {
  const hasToken = !!process.env.REPLICATE_API_TOKEN;
  const tokenPrefix = process.env.REPLICATE_API_TOKEN 
    ? process.env.REPLICATE_API_TOKEN.substring(0, 5) + "..."
    : "NOT SET";
  
  res.status(200).json({
    message: "API Test Endpoint",
    environment: process.env.NODE_ENV || "development",
    hasReplicateToken: hasToken,
    tokenPrefix: tokenPrefix,
    timestamp: new Date().toISOString()
  });
}
