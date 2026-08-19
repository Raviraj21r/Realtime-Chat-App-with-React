import { ArrowLeft, XIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";

function ChatHeader() {
  const { selectedUser, setSelectedUser } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const isOnline = onlineUsers.includes(selectedUser._id);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };

    window.addEventListener("keydown", handleEscKey);

    // cleanup function
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  return (
    <div
      className="flex justify-between items-center bg-[#202c33] border-b border-[#2a3942] px-4 py-3 flex-shrink-0"
    >
      <div className="flex items-center space-x-3">
        {/* Mobile Back Button */}
        <button
          onClick={() => setSelectedUser(null)}
          className="md:hidden p-2 -ml-2 text-[#aebac1] hover:text-[#e9edef] transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className={`avatar ${isOnline ? "online" : "offline"}`}>
          <div className="w-10 h-10 rounded-full">
            <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} />
          </div>
        </div>

        <div>
          <h3 className="text-[#e9edef] font-medium text-base">{selectedUser.fullName}</h3>
          <p className="text-[#8696a0] text-sm">{isOnline ? "online" : "offline"}</p>
        </div>
      </div>

      <button onClick={() => setSelectedUser(null)} className="hidden md:block">
        <XIcon className="w-5 h-5 text-[#aebac1] hover:text-[#e9edef] transition-colors cursor-pointer" />
      </button>
    </div>
  );
}
export default ChatHeader;
