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
    <div className="relative w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="h-full flex flex-col md:flex-row">
        {/* LEFT SIDE - Sidebar */}
        <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} w-full md:w-96 lg:w-[420px] bg-slate-800/80 backdrop-blur-xl flex-col border-r border-slate-700/50`}>
          <ProfileHeader />
          <ActiveTabSwitch />
          <StatusBar />

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activeTab === "chats" ? <ChatsList /> : <ContactList />}
          </div>
        </div>

        {/* RIGHT SIDE - Chat Area */}
        <div className={`${selectedUser ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-slate-900/80 backdrop-blur-xl`}>
          {selectedUser ? <ChatContainer /> : <NoConversationPlaceholder />}
        </div>
      </div>
    </div>
  );
}
export default ChatPage;
