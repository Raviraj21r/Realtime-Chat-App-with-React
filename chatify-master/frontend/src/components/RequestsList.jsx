import { useEffect } from "react";
import { Check, X } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";

function RequestsList() {
  const { followRequests, getFollowRequests, respondToFollowRequest, isUsersLoading } = useChatStore();

  useEffect(() => {
    getFollowRequests();
  }, [getFollowRequests]);

  if (isUsersLoading) return <UsersLoadingSkeleton />;
  if (followRequests.length === 0) {
    return <p className="text-[#8696a0] text-center py-8 px-4">No follow requests</p>;
  }

  return (
    <div>
      {followRequests.map((request) => (
        <div key={request._id} className="flex items-center gap-3 px-4 py-3 border-b border-[#202c33]">
          <img
            src={request.followerId.profilePic || "/avatar.png"}
            alt={request.followerId.fullName}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-[#e9edef] font-medium truncate">{request.followerId.fullName}</h4>
            <p className="text-[#8696a0] text-sm truncate">wants to follow you</p>
          </div>
          <button
            title="Accept follow request"
            onClick={() => respondToFollowRequest(request._id, "accepted")}
            className="p-2 text-[#00a884] hover:bg-[#2a3942] rounded-full"
          >
            <Check className="w-5 h-5" />
          </button>
          <button
            title="Reject follow request"
            onClick={() => respondToFollowRequest(request._id, "rejected")}
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
