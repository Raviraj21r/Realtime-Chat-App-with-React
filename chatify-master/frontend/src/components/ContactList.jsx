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
      <input
        type="text"
        placeholder="Search users by name or email..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />
      {displayUsers.length === 0 ? (
        <p className="text-slate-400 text-center py-4">
          {searchQuery.trim() ? "No users found" : "No contacts available"}
        </p>
      ) : (
        displayUsers.map((contact) => (
          <div
            key={contact._id}
            className="bg-cyan-500/10 p-4 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition-colors"
            onClick={() => setSelectedUser(contact)}
          >
            <div className="flex items-center gap-3">
              <div className={`avatar ${onlineUsers.includes(contact._id) ? "online" : "offline"}`}>
                <div className="size-12 rounded-full">
                  <img src={contact.profilePic || "/avatar.png"} />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-slate-200 font-medium">{contact.fullName}</h4>
                {searchQuery.trim() && <p className="text-slate-400 text-sm">{contact.email}</p>}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
export default ContactList;
