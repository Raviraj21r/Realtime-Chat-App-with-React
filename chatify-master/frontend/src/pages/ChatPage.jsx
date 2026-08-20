import { useChatStore } from "../store/useChatStore";

import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatsList";
import ContactList from "../components/ContactList";
import RequestsList from "../components/RequestsList";
import ChatContainer from "../components/ChatContainer";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder";
import StatusBar from "../components/StatusBar";

function ChatPage() {
  const { activeTab, selectedUser } = useChatStore();

  return (
    <div className="relative w-full h-screen bg-[#0b141a] overflow-x-hidden">
      <div className="h-full w-full overflow-x-hidden">
        {/* LEFT SIDE - Sidebar - Only show on mobile when no user selected, always show on desktop */}
        {!selectedUser && (
          <div className="h-full w-full md:w-[420px] lg:w-[450px] md:flex flex-col bg-[#111b21] border-r border-[#2a3942]">
            <ProfileHeader />
            <ActiveTabSwitch />
            <StatusBar />

            <div className="flex-1 overflow-y-auto p-0 space-y-0">
              {activeTab === "chats" ? <ChatsList /> : activeTab === "requests" ? <RequestsList /> : <ContactList />}
            </div>
          </div>
        )}

        {/* RIGHT SIDE - Chat Area - Only show on mobile when user selected, always show on desktop */}
        {selectedUser && (
          <div className="h-full w-full flex flex-col bg-[#0b141a]">
            <ChatContainer />
          </div>
        )}

        {/* Desktop: Show both sidebar and chat side-by-side */}
        <div className="hidden md:flex h-full w-full">
          {/* Desktop Sidebar */}
          <div className="w-[420px] lg:w-[450px] flex flex-col bg-[#111b21] border-r border-[#2a3942]">
            <ProfileHeader />
            <ActiveTabSwitch />
            <StatusBar />

            <div className="flex-1 overflow-y-auto p-0 space-y-0">
              {activeTab === "chats" ? <ChatsList /> : activeTab === "requests" ? <RequestsList /> : <ContactList />}
            </div>
          </div>

          {/* Desktop Chat Area */}
          <div className="flex-1 flex flex-col bg-[#0b141a]">
            {selectedUser ? <ChatContainer /> : <NoConversationPlaceholder />}
          </div>
        </div>
      </div>
    </div>
  );
}
export default ChatPage;
