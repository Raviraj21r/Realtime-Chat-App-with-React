import { useChatStore } from "../store/useChatStore";

function ActiveTabSwitch() {
  const { activeTab, setActiveTab } = useChatStore();

  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-[#202c33]">
      <button
        onClick={() => setActiveTab("chats")}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          activeTab === "chats" 
            ? "bg-[#00a884] text-white" 
            : "text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef]"
        }`}
      >
        Chats
      </button>

      <button
        onClick={() => setActiveTab("contacts")}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          activeTab === "contacts" 
            ? "bg-[#00a884] text-white" 
            : "text-[#8696a0] hover:bg-[#2a3942] hover:text-[#e9edef]"
        }`}
      >
        Contacts
      </button>
    </div>
  );
}
export default ActiveTabSwitch;
