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
    <>
      {chats.map((chat) => (
        <div
          key={chat._id}
          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-700/50 transition-all duration-200 active:scale-[0.98]"
          onClick={() => setSelectedUser(chat)}
        >
          <div className="relative flex-shrink-0">
            <div className={`avatar ${onlineUsers.includes(chat._id) ? "online" : "offline"}`}>
              <div className="w-12 h-12 rounded-full">
                <img src={chat.profilePic || "/avatar.png"} alt={chat.fullName} />
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-slate-200 font-semibold truncate">{chat.fullName}</h4>
              <span className="text-xs text-slate-500">12:30</span>
            </div>
            <p className="text-slate-400 text-sm truncate mt-1">Tap to start chatting</p>
          </div>
        </div>
      ))}
    </>
  );
}
export default ChatsList;
