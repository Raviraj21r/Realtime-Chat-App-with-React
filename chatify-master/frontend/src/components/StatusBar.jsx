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
      <div className="flex gap-4 overflow-x-auto p-4 border-b border-slate-700/50 scrollbar-hide">
        {/* My Status */}
        <div
          className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0"
          onClick={() => setShowUploadModal(true)}
        >
          <div className="relative">
            <div className="size-16 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 p-0.5">
              <div className="size-full rounded-full bg-slate-800 p-0.5">
                <img
                  src={authUser?.profilePic || "/avatar.png"}
                  alt="My status"
                  className="size-full rounded-full object-cover"
                />
              </div>
            </div>
            <div className="absolute bottom-0 right-0 bg-cyan-500 rounded-full p-1">
              <svg className="size-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
          <span className="text-xs text-slate-300">My status</span>
        </div>

        {/* Other Users' Statuses */}
        {allStatuses
          .filter((status) => !status.isMyStatus)
          .map((status) => (
            <div
              key={status._id}
              className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0"
            >
              <div className="size-16 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-0.5">
                <div className="size-full rounded-full bg-slate-800 p-0.5">
                  <img
                    src={status.userId?.profilePic || "/avatar.png"}
                    alt={status.userId?.fullName}
                    className="size-full rounded-full object-cover"
                  />
                </div>
              </div>
              <span className="text-xs text-slate-300 truncate w-16 text-center">
                {status.userId?.fullName?.split(" ")[0]}
              </span>
            </div>
          ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-slate-200 mb-4">Create Status</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Text (optional)</label>
                <textarea
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Image (optional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 hover:bg-slate-700 transition-colors"
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
                  className="flex-1 px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitStatus}
                  disabled={!statusText.trim() && !statusImage}
                  className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
