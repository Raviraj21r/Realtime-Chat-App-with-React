import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import { Trash2, Check, CheckCheck } from "lucide-react";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage, // ⚠️ स्टोर से deleteMessage फंक्शन ले लिया
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();

    // clean up
    return () => unsubscribeFromMessages();
  }, [selectedUser._id]); // Only re-run when selectedUser changes

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="h-screen flex flex-col">
      <ChatHeader />
      <div className="flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 py-2">
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 pb-4">
            {messages.map((msg) => (
              <div
                key={msg._id}
                className={`chat ${msg.senderId === authUser._id ? "chat-end" : "chat-start"} ${msg.isDeleting ? "message-deleting" : ""}`}
              >
                <div
                  className={`chat-bubble relative group max-w-[85%] sm:max-w-[70%] ${
                    msg.senderId === authUser._id
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-800 text-slate-200"
                  }`}
                >
                  {msg.image && (
                    <img src={msg.image} alt="Shared" className="rounded-lg h-48 w-full object-cover" />
                  )}
                  {msg.video && (
                    <video src={msg.video} controls className="rounded-lg h-48 w-full object-cover bg-slate-950" />
                  )}
                  {msg.text && <p className="mt-2 break-words">{msg.text}</p>}
                  
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      {/* Read receipts for sent messages */}
                      {msg.senderId === authUser._id && (
                        <>
                          {msg.isOptimistic ? (
                            // Sending state - no tick
                            <div className="w-3.5 h-3.5" />
                          ) : msg.isRead ? (
                            // Read - double blue ticks
                            <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                          ) : msg.isDelivered ? (
                            // Delivered - double gray ticks
                            <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
                          ) : (
                            // Sent - single gray tick
                            <Check className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </>
                      )}
                      <p className="text-xs opacity-75">
                        {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {/* Delete button for own messages */}
                    {msg.senderId === authUser._id && !msg.isOptimistic && (
                      <button
                        onClick={() => deleteMessage(msg._id)}
                        className="text-red-200 hover:text-red-400 p-1 ml-2 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {/* Scroll target */}
            <div ref={messageEndRef} />
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        )}
      </div>

      <MessageInput />
    </div>
  );
}

export default ChatContainer;