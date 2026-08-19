import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import { useAuthStore } from "../store/useAuthStore";

function ChatsList() {
  const { getMyChatPartners, chats, isUsersLoading, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();

  useEffect(() => {
    getMyChatPartners();
  }, [getMyChatPartners]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;
  if (chats.length === 0) return <NoChatsFound />;

  return (
    <div className="overflow-x-hidden">
      {chats.map((chat) => (
        <div
          key={chat._id}
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#202c33] transition-colors active:bg-[#2a3942]"
          onClick={() => setSelectedUser(chat)}
        >
          <div className="relative flex-shrink-0">
            <div className={`avatar ${onlineUsers.includes(chat._id) ? "online" : "offline"}`}>
              <div className="w-12 h-12 rounded-full">
                <img src={chat.profilePic || "/avatar.png"} alt={chat.fullName} />
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-w-0 border-b border-[#202c33] pb-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[#e9edef] font-medium truncate text-base">{chat.fullName}</h4>
              <span className="text-xs text-[#8696a0]">12:30</span>
            </div>
            <p className="text-[#8696a0] text-sm truncate mt-0.5">Tap to start chatting</p>
          </div>
        </div>
      ))}
    </div>
  );
}
export default ChatsList;
