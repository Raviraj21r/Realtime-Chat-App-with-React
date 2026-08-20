import { useEffect, useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import toast from 'react-hot-toast';

function ContactList() {
  const { getAllContacts, allContacts, setSelectedUser, isUsersLoading, searchUsers, searchResults, sendFollowRequest, followBackByUser, getBulkRelationshipStatus } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [relationshipStatuses, setRelationshipStatuses] = useState({});
  const [isLoadingStatus, setIsLoadingStatus] = useState({});

  useEffect(() => {
    getAllContacts();
  }, [getAllContacts]);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers(searchQuery);
    }
  }, [searchQuery, searchUsers]);

  const displayUsers = searchQuery.trim() ? searchResults : allContacts;

  // Fetch relationship status for all users in bulk
  useEffect(() => {
    const fetchAllStatuses = async () => {
      const usersToCheck = displayUsers.filter(u => u._id !== authUser._id);
      const userIds = usersToCheck.map(u => u._id.toString());
      
      console.log("Display users:", displayUsers.map(u => ({ id: u._id, name: u.fullName })));
      
      if (userIds.length === 0) {
        setRelationshipStatuses({});
        return;
      }

      setRelationshipStatuses((previousStatuses) => {
        const nextStatuses = {};
        userIds.forEach((id) => {
          nextStatuses[id] = previousStatuses[id] || "loading";
        });
        return nextStatuses;
      });
      
      try {
        const statuses = await getBulkRelationshipStatus(userIds);
        setRelationshipStatuses((previousStatuses) => ({ ...previousStatuses, ...statuses }));
      } catch (error) {
        console.error("Error fetching bulk statuses:", error);
        const defaultStatuses = {};
        userIds.forEach(id => defaultStatuses[id] = 'none');
        setRelationshipStatuses((previousStatuses) => ({ ...previousStatuses, ...defaultStatuses }));
      }
    };

    if (displayUsers.length > 0 && authUser._id) {
      fetchAllStatuses();
    }
  }, [displayUsers, authUser._id, getBulkRelationshipStatus]);

  const handleFollow = async (userId) => {
    const previousStatus = relationshipStatuses[userId] || "none";
    if (previousStatus !== "none") return;

    setRelationshipStatuses(prev => ({ ...prev, [userId]: 'pending' }));
    try {
      setIsLoadingStatus(prev => ({ ...prev, [userId]: true }));
      await sendFollowRequest(userId);
    } catch (error) {
      console.error("Failed to send follow request:", error);
      setRelationshipStatuses(prev => ({ ...prev, [userId]: previousStatus }));
      
      // Handle 409 Conflict (relationship already exists)
      if (error.response?.status === 409 || error.response?.data?.message?.includes("already")) {
        // Treat as success - relationship exists, set to pending
        setRelationshipStatuses(prev => ({ ...prev, [userId]: 'pending' }));
        toast.success("Follow request already sent");
      } else {
        // For other errors, show error message
        const errorMessage = error.response?.data?.message || error.message || "Failed to send follow request";
        toast.error(errorMessage);
      }
    } finally {
      setIsLoadingStatus(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleFollowBack = async (userId) => {
    setIsLoadingStatus(prev => ({ ...prev, [userId]: true }));
    try {
      await followBackByUser(userId);
      setRelationshipStatuses(prev => ({ ...prev, [userId]: 'accepted' }));
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to follow back");
    } finally {
      setIsLoadingStatus(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleUserClick = async (contact) => {
    const status = relationshipStatuses[contact._id] || 'none';
    if (status === 'accepted') {
      setSelectedUser(contact);
    } else {
      toast.error("Please follow this user to start chatting");
    }
  };

  const getFollowButtonState = (userId) => {
    const status = relationshipStatuses[userId];
    const loading = isLoadingStatus[userId];

    console.log(`Button state for ${userId}: status=${status}, loading=${loading}`);

    if (loading) {
      return { text: '...', disabled: true, icon: null };
    }

    if (status === 'pending') {
      return { text: 'Requested', disabled: true, icon: null };
    }

    if (status === 'accepted') {
      return { text: 'Following', disabled: true, icon: <UserCheck className="w-5 h-5" /> };
    }

    if (status === 'incoming_pending') {
      return { text: 'Follow back', disabled: false, icon: <UserPlus className="w-5 h-5" /> };
    }

    if (!status || status === 'loading') {
      return { text: '...', disabled: true, icon: null };
    }

    return { text: 'Follow', disabled: false, icon: <UserPlus className="w-5 h-5" /> };
  };

  if (isUsersLoading) return <UsersLoadingSkeleton />;

  return (
    <div className="space-y-0 overflow-x-hidden">
      <div className="px-4 py-2 bg-[#111b21]">
        <div className="relative">
          <input
            type="text"
            placeholder="Search users to follow"
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
          contact._id !== authUser._id && (
            <div
              key={contact._id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[#202c33] transition-colors active:bg-[#2a3942]"
            >
              <div className="relative flex-shrink-0">
                <div className={`avatar ${onlineUsers.includes(contact._id) ? "online" : "offline"}`}>
                  <div className="w-12 h-12 rounded-full">
                    <img src={contact.profilePic || "/avatar.png"} />
                  </div>
                </div>
              </div>
              
              <div 
                className="flex-1 min-w-0 border-b border-[#202c33] pb-3 cursor-pointer"
                onClick={() => handleUserClick(contact)}
              >
                <h4 className="text-[#e9edef] font-medium truncate text-base">{contact.fullName}</h4>
                {searchQuery.trim() && <p className="text-[#8696a0] text-sm truncate">{contact.email}</p>}
              </div>

              <button
                onClick={() => relationshipStatuses[contact._id] === 'incoming_pending'
                  ? handleFollowBack(contact._id)
                  : handleFollow(contact._id)}
                disabled={getFollowButtonState(contact._id).disabled}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  getFollowButtonState(contact._id).disabled
                    ? 'bg-[#2a3942] text-[#8696a0] cursor-not-allowed'
                    : 'bg-[#00a884] text-[#e9edef] hover:bg-[#00a884]/90'
                }`}
                title={getFollowButtonState(contact._id).text}
              >
                {getFollowButtonState(contact._id).icon || getFollowButtonState(contact._id).text}
              </button>
            </div>
          )
        ))
      )}
    </div>
  );
}
export default ContactList;
