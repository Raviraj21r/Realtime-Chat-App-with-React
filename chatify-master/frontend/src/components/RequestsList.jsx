import { useCallback, useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";

function RequestsList() {
  const { followRequests, getFollowRequests, followBack, rejectFollowRequest } = useChatStore();
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      await getFollowRequests();
    } finally {
      setIsLoading(false);
    }
  }, [getFollowRequests]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleFollowBack = async (relationshipId) => {
    await followBack(relationshipId);
    fetchRequests();
  };

  const handleReject = async (relationshipId) => {
    await rejectFollowRequest(relationshipId);
    fetchRequests();
  };

  if (isLoading) return <UsersLoadingSkeleton />;
  if (followRequests.length === 0) {
    return <p className="text-[#8696a0] text-center py-8 px-4">No follow requests</p>;
  }

  return (
    <div className="overflow-x-hidden">
      {followRequests.map((request) => (
        <div key={request._id} className="flex items-center gap-3 px-4 py-3 border-b border-[#202c33]">
          <img
            src={request.requester?.profilePic || "/avatar.png"}
            alt={request.requester?.fullName || "User"}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-[#e9edef] font-medium truncate">{request.requester?.fullName || "Unknown user"}</h4>
            <p className="text-[#8696a0] text-xs truncate">{request.requester?.email || "Follow request"}</p>
          </div>
          <button
            title="Follow back"
            aria-label={`Follow back ${request.requester?.fullName || "user"}`}
            onClick={() => handleFollowBack(request._id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[#00a884] hover:bg-[#008f72] rounded-lg"
          >
            <UserPlus className="w-4 h-4" />
            Follow back
          </button>
          <button
            title="Reject follow request"
            onClick={() => handleReject(request._id)}
            className="p-2 text-[#ef4444] hover:bg-[#2a3942] rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default RequestsList;
