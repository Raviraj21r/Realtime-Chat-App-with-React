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
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 pl-10 bg-slate-700/50 border border-slate-600/50 rounded-xl text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      
      {displayUsers.length === 0 ? (
        <p className="text-slate-400 text-center py-8">
          {searchQuery.trim() ? "No users found" : "No contacts available"}
        </p>
      ) : (
        displayUsers.map((contact) => (
          <div
            key={contact._id}
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-700/50 transition-all duration-200 active:scale-[0.98]"
            onClick={() => setSelectedUser(contact)}
          >
            <div className="relative flex-shrink-0">
              <div className={`avatar ${onlineUsers.includes(contact._id) ? "online" : "offline"}`}>
                <div className="w-12 h-12 rounded-full">
                  <img src={contact.profilePic || "/avatar.png"} />
                </div>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-slate-200 font-semibold truncate">{contact.fullName}</h4>
              {searchQuery.trim() && <p className="text-slate-400 text-sm truncate">{contact.email}</p>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
export default ContactList;
