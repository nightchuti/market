// ตัวอย่างการใช้ MongoDB Atlas Vector Search
const aiMatch = async (userTradeVector) => {
  return await Trade.aggregate([
    {
      "$vectorSearch": {
        "index": "vector_index", // ต้องตั้งค่าใน MongoDB Atlas
        "path": "embeddings",
        "queryVector": userTradeVector,
        "numCandidates": 100,
        "limit": 10
      }
    },
    {
      "$match": { "status": "Open" }
    }
  ]);
};