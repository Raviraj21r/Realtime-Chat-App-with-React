import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import { Trash2, Check, CheckCheck, Ban } from "lucide-react";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    deleteMessage,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);
  const [deleteMenuOpen, setDeleteMenuOpen] = useState(null);

  useEffect(() => {
    if (!selectedUser) return undefined;

    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();

    // clean up
    return () => unsubscribeFromMessages();
  }, [selectedUser, getMessagesByUserId, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleDeleteForMe = async (messageId) => {
    await deleteMessage(messageId, false);
    setDeleteMenuOpen(null);
  };

  const handleDeleteForEveryone = async (messageId) => {
    await deleteMessage(messageId, true);
    setDeleteMenuOpen(null);
  };

  const canDeleteForEveryone = (msg) => {
    if (msg.senderId !== authUser._id) return false;
    const messageTime = new Date(msg.createdAt);
    const currentTime = new Date();
    const hoursDiff = (currentTime - messageTime) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden overflow-x-hidden bg-[#0b141a]" onClick={() => setDeleteMenuOpen(null)}>
      <ChatHeader />
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 sm:px-4 py-2">
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="max-w-3xl mx-auto space-y-1.5 pb-4">
            {messages.map((msg) => (
              <div
                key={msg._id}
                className={`flex ${msg.senderId === authUser._id ? "justify-end" : "justify-start"} ${msg.isDeleting ? "message-deleting" : ""}`}
              >
                <div
                  className={`relative group max-w-[75%] sm:max-w-[65%] px-3 py-2 rounded-lg ${
                    msg.senderId === authUser._id
                      ? "bg-[#005c4b] text-[#e9edef] rounded-tr-sm"
                      : "bg-[#202c33] text-[#e9edef] rounded-tl-sm"
                  }`}
                >
                  {msg.image && (
                    <img src={msg.image} alt="Shared" className="rounded-lg h-48 w-full object-cover mb-1" />
                  )}
                  {msg.video && (
                    <video src={msg.video} controls className="rounded-lg h-48 w-full object-cover bg-[#0b141a] mb-1" />
                  )}
                  {msg.text && <p className="break-words text-sm leading-relaxed">{msg.text}</p>}
                  
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <p className="text-xs text-[#8696a0]">
                      {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    
                    {/* Read receipts for sent messages */}
                    {msg.senderId === authUser._id && (
                      <>
                        {msg.isOptimistic ? (
                          // Sending state - clock icon
                          <svg className="w-3.5 h-3.5 text-[#8696a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : msg.isRead ? (
                          // Read - double blue ticks
                          <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                        ) : msg.isDelivered ? (
                          // Delivered - double gray ticks
                          <CheckCheck className="w-3.5 h-3.5 text-[#8696a0]" />
                        ) : (
                          // Sent - single gray tick
                          <Check className="w-3.5 h-3.5 text-[#8696a0]" />
                        )}
                      </>
                    )}

                    {/* Delete menu trigger */}
                    {!msg.isOptimistic && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteMenuOpen(deleteMenuOpen === msg._id ? null : msg._id);
                        }}
                        className="text-[#8696a0] hover:text-[#e9edef] p-1 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete menu dropdown */}
                    {deleteMenuOpen === msg._id && (
                      <div
                        className="absolute bottom-full right-0 mb-2 bg-[#233138] rounded-lg shadow-xl overflow-hidden min-w-[140px] z-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleDeleteForMe(msg._id)}
                          className="w-full px-4 py-3 text-left text-[#e9edef] hover:bg-[#182229] text-sm transition-colors"
                        >
                          Delete for me
                        </button>
                        {msg.senderId === authUser._id && canDeleteForEveryone(msg) && (
                          <button
                            onClick={() => handleDeleteForEveryone(msg._id)}
                            className="w-full px-4 py-3 text-left text-[#e9edef] hover:bg-[#182229] text-sm transition-colors border-t border-[#2a3942]"
                          >
                            Delete for everyone
                          </button>
                        )}
                      </div>
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