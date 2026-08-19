import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import { useAuthStore } from "../store/useAuthStore";

function ContactList() {
  const { getAllContacts, allContacts, setSelectedUser, isUsersLoading, searchUsers, searchResults } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    getAllContacts();
  }, [getAllContacts]);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers(searchQuery);
    }
  }, [searchQuery, searchUsers]);

  const displayUsers = searchQuery.trim() ? searchResults : allContacts;

  if (isUsersLoading) return <UsersLoadingSkeleton />;

  return (
    <div className="space-y-0 overflow-x-hidden">
      <div className="px-4 py-2 bg-[#111b21]">
        <div className="relative">
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 bg-[#202c33] border border-[#3b4a54] rounded-lg text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition-all text-sm"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8696a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      
      {displayUsers.length === 0 ? (
        <p className="text-[#8696a0] text-center py-8 px-4">
          {searchQuery.trim() ? "No users found" : "No contacts available"}
        </p>
      ) : (
        displayUsers.map((contact) => (
          <div
            key={contact._id}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#202c33] transition-colors active:bg-[#2a3942]"
            onClick={() => setSelectedUser(contact)}
          >
            <div className="relative flex-shrink-0">
              <div className={`avatar ${onlineUsers.includes(contact._id) ? "online" : "offline"}`}>
                <div className="w-12 h-12 rounded-full">
                  <img src={contact.profilePic || "/avatar.png"} />
                </div>
              </div>
            </div>
            
            <div className="flex-1 min-w-0 border-b border-[#202c33] pb-3">
              <h4 className="text-[#e9edef] font-medium truncate text-base">{contact.fullName}</h4>
              {searchQuery.trim() && <p className="text-[#8696a0] text-sm truncate">{contact.email}</p>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
export default ContactList;
