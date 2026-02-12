const ChatRoom = require("./models/ChatRoom");
const Message = require("./models/Message");

// 1. เริ่มต้นแชท (Create or Get Room)
exports.initiateChat = async (req, res) => {
  const { receiverId, productId } = req.body;
  const userId = req.user.id; // จาก Middleware

  try {
    // เช็คว่าเคยคุยกันเรื่องสินค้านี้ไหม
    let chatRoom = await ChatRoom.findOne({
      participants: { $all: [userId, receiverId] },
      productId: productId
    });

    // ถ้าไม่มี ให้สร้างใหม่
    if (!chatRoom) {
      chatRoom = await ChatRoom.create({
        participants: [userId, receiverId],
        productId: productId
      });
    }

    res.json(chatRoom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. ดึงข้อความในห้อง (Get Messages)
exports.getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.roomId })
      .populate("sender", "username profileImage")
      .sort({ createdAt: 1 }); // เก่า -> ใหม่
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. ดึงรายการห้องแชทของฉัน (My Chat List)
exports.getMyChats = async (req, res) => {
  try {
    const chats = await ChatRoom.find({ participants: req.user.id })
      .populate("participants", "username profileImage") // เอาข้อมูลคู่สนทนา
      .populate("productId", "title images") // เอาข้อมูลสินค้า
      .sort({ updatedAt: -1 }); // เอาห้องที่คุยล่าสุดขึ้นก่อน
    
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};