import { ArrowLeft, XIcon, MoreVertical } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";

function ChatHeader() {
  const { selectedUser, setSelectedUser, clearChat } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const isOnline = onlineUsers.includes(selectedUser._id);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };

    window.addEventListener("keydown", handleEscKey);

    // cleanup function
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClearChat = async () => {
    await clearChat(selectedUser._id);
    setMenuOpen(false);
  };

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

      <div className="flex items-center gap-2">
        {/* Menu button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-[#aebac1] hover:text-[#e9edef] transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 bg-[#233138] rounded-lg shadow-xl overflow-hidden min-w-[180px] z-50">
              <button
                onClick={handleClearChat}
                className="w-full px-4 py-3 text-left text-[#e9edef] hover:bg-[#182229] text-sm transition-colors"
              >
                Clear chat
              </button>
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full px-4 py-3 text-left text-[#e9edef] hover:bg-[#182229] text-sm transition-colors border-t border-[#2a3942]"
              >
                Close chat
              </button>
            </div>
          )}
        </div>

        {/* Desktop close button */}
        <button onClick={() => setSelectedUser(null)} className="hidden md:block">
          <XIcon className="w-5 h-5 text-[#aebac1] hover:text-[#e9edef] transition-colors cursor-pointer" />
        </button>
      </div>
    </div>
  );
}
export default ChatHeader;
