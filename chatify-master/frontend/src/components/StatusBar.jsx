import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

function StatusBar() {
  const { activeStatuses, myStatus, createStatus, getActiveStatuses, getMyStatus } = useChatStore();
  const { authUser } = useAuthStore();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [statusImage, setStatusImage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    getActiveStatuses();
    getMyStatus();
  }, [getActiveStatuses, getMyStatus]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStatusImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitStatus = async () => {
    if (!statusText.trim() && !statusImage) return;
    
    await createStatus({ text: statusText, image: statusImage });
    setStatusText("");
    setStatusImage("");
    setShowUploadModal(false);
  };

  const allStatuses = [
    ...(myStatus ? [{ ...myStatus, userId: authUser, isMyStatus: true }] : []),
    ...activeStatuses,
  ];

  return (
    <>
      <div className="flex gap-4 overflow-x-auto px-4 py-3 border-b border-[#202c33] scrollbar-hide bg-[#111b21]">
        {/* My Status */}
        <div
          className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0"
          onClick={() => setShowUploadModal(true)}
        >
          <div className="relative">
            <div className="size-14 rounded-full bg-gradient-to-tr from-[#00a884] to-[#25d366] p-0.5">
              <div className="size-full rounded-full bg-[#111b21] p-0.5">
                <img
                  src={authUser?.profilePic || "/avatar.png"}
                  alt="My status"
                  className="size-full rounded-full object-cover"
                />
              </div>
            </div>
            <div className="absolute bottom-0 right-0 bg-[#00a884] rounded-full p-1 border-2 border-[#111b21]">
              <svg className="size-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          <span className="text-xs text-[#8696a0]">My status</span>
        </div>

        {/* Other Users' Statuses */}
        {allStatuses
          .filter((status) => !status.isMyStatus)
          .map((status) => (
            <div
              key={status._id}
              className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0"
            >
              <div className="size-14 rounded-full bg-gradient-to-tr from-[#00a884] to-[#25d366] p-0.5">
                <div className="size-full rounded-full bg-[#111b21] p-0.5">
                  <img
                    src={status.userId?.profilePic || "/avatar.png"}
                    alt={status.userId?.fullName}
                    className="size-full rounded-full object-cover"
                  />
                </div>
              </div>
              <span className="text-xs text-[#8696a0] truncate w-14 text-center">
                {status.userId?.fullName?.split(" ")[0]}
              </span>
            </div>
          ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#202c33] rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-[#e9edef] mb-4">Create Status</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#8696a0] mb-2">Text (optional)</label>
                <textarea
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full px-4 py-2 bg-[#2a3942] border border-[#3b4a54] rounded-lg text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:ring-2 focus:ring-[#00a884] resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm text-[#8696a0] mb-2">Image (optional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-2 bg-[#2a3942] border border-[#3b4a54] rounded-lg text-[#e9edef] hover:bg-[#3b4a54] transition-colors"
                >
                  {statusImage ? "Change Image" : "Upload Image"}
                </button>
                {statusImage && (
                  <img
                    src={statusImage}
                    alt="Preview"
                    className="mt-2 w-full h-32 object-cover rounded-lg"
                  />
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setStatusText("");
                    setStatusImage("");
                  }}
                  className="flex-1 px-4 py-2 bg-[#2a3942] text-[#e9edef] rounded-lg hover:bg-[#3b4a54] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitStatus}
                  disabled={!statusText.trim() && !statusImage}
                  className="flex-1 px-4 py-2 bg-[#00a884] text-white rounded-lg hover:bg-[#00a884]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Post Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StatusBar;
