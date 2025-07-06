import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
  },
  edited: {
    type: Boolean,
    default: false,
  },
  clearedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: [],
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true,
      enum: ['❤️', '👍', '👎', '😂', '😮', '😢', '😡', '🎉', '👏', '🔥']
    }
  }],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  fileUrl: String,
  fileType: String,
  fileName: String,
  audioUrl: String,
  audioDuration: Number,
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);
export default Message; 