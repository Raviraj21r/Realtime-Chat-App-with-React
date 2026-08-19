import { useChatStore } from "../store/useChatStore";

import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatsList";
import ContactList from "../components/ContactList";
import ChatContainer from "../components/ChatContainer";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder";
import StatusBar from "../components/StatusBar";

function ChatPage() {
  const { activeTab, selectedUser } = useChatStore();

  return (
    <div className="relative w-full h-screen bg-[#0b141a]">
      <div className="h-full flex flex-col md:flex-row">
        {/* LEFT SIDE - Sidebar */}
        <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} w-full md:w-[420px] lg:w-[450px] bg-[#111b21] flex flex-col border-r border-[#202c33]`}>
          <ProfileHeader />
          <ActiveTabSwitch />
          <StatusBar />

          <div className="flex-1 overflow-y-auto p-0 space-y-0">
            {activeTab === "chats" ? <ChatsList /> : <ContactList />}
          </div>
        </div>

        {/* RIGHT SIDE - Chat Area */}
        <div className={`${selectedUser ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-[#0b141a]`}>
          {selectedUser ? <ChatContainer /> : <NoConversationPlaceholder />}
        </div>
      </div>
    </div>
  );
}
export default ChatPage;
