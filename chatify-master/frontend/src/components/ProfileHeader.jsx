import { useState, useRef, useEffect } from "react";
import { LogOutIcon, VolumeOffIcon, Volume2Icon, Bell, UserPlus } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const mouseClickSound = new Audio("/sounds/mouse-click.mp3");

function ProfileHeader() {
  const { logout, authUser, updateProfile, notifications, unreadCount, getNotifications, markNotificationsAsRead, deleteNotification } = useAuthStore();
  const { isSoundEnabled, toggleSound, followBack, followBackByUser } = useChatStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    getNotifications();
  }, [getNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onloadend = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const handleFollowBack = async (notification) => {
    const relationshipId = notification.relatedId?._id || notification.relatedId;
    try {
      if (relationshipId) {
        await followBack(relationshipId);
      } else if (notification.senderId?._id) {
        await followBackByUser(notification.senderId._id);
      } else {
        throw new Error("Follow request details are missing");
      }
      await deleteNotification(notification._id);
    } catch (error) {
      console.error("Follow back notification error:", error);
    }
  };

  return (
    <div className="h-16 bg-[#202c33] flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* AVATAR */}
        <div className="avatar online">
          <button
            className="size-10 rounded-full overflow-hidden relative group"
            onClick={() => fileInputRef.current.click()}
          >
            <img
              src={selectedImg || authUser.profilePic || "/avatar.png"}
              alt="User image"
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="text-white text-xs">Change</span>
            </div>
          </button>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* USERNAME & ONLINE TEXT */}
        <div>
          <h3 className="text-[#e9edef] font-medium text-base max-w-[180px] truncate">
            {authUser.fullName}
          </h3>

          <p className="text-[#8696a0] text-xs">Online</p>
        </div>
      </div>

      {/* BUTTONS */}
      <div className="flex gap-4 items-center">
        {/* NOTIFICATION BELL */}
        <div className="relative" ref={notificationRef}>
          <button
            className="text-[#aebac1] hover:text-[#e9edef] transition-colors relative"
            onClick={() => {
              setNotificationOpen(!notificationOpen);
              if (notificationOpen) {
                markNotificationsAsRead();
              }
            }}
          >
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#00a884] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* NOTIFICATION PANEL */}
          {notificationOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-[#233138] rounded-lg shadow-xl overflow-hidden z-50">
              <div className="p-3 border-b border-[#2a3942] flex justify-between items-center">
                <h3 className="text-[#e9edef] font-medium">Notifications</h3>
                <button
                  onClick={() => {
                    markNotificationsAsRead();
                    setNotificationOpen(false);
                  }}
                  className="text-xs text-[#00a884] hover:text-[#00a884]/80"
                >
                  Mark all read
                </button>
              </div>
              <div className="overflow-y-auto max-h-72">
                {notifications.length === 0 ? (
                  <p className="text-[#8696a0] text-center py-8 text-sm">No notifications</p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification._id}
                      className={`p-3 border-b border-[#2a3942] hover:bg-[#182229] transition-colors ${!notification.isRead ? 'bg-[#1a272e]' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={notification.senderId?.profilePic || "/avatar.png"}
                          alt="Sender"
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[#e9edef] text-sm font-medium truncate">
                            {notification.senderId?.fullName || 'Unknown'}
                          </p>
                          <p className="text-[#8696a0] text-xs mt-1">
                            {notification.type === 'follow_request' && 'sent you a follow request'}
                            {notification.type === 'follow_accepted' && 'accepted your follow request'}
                            {notification.type === 'follow_rejected' && 'rejected your follow request'}
                            {notification.type === 'new_message' && 'sent you a message'}
                          </p>
                          <p className="text-[#54656f] text-xs mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                          {notification.type === "follow_request" && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleFollowBack(notification);
                              }}
                              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00a884] text-white text-xs font-medium hover:bg-[#008f72]"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Follow back
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => deleteNotification(notification._id)}
                          className="text-[#8696a0] hover:text-[#e9edef] p-1"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* SOUND TOGGLE BTN */}
        <button
          className="text-[#aebac1] hover:text-[#e9edef] transition-colors"
          onClick={() => {
            // play click sound before toggling
            mouseClickSound.currentTime = 0; // reset to start
            mouseClickSound.play().catch((error) => console.log("Audio play failed:", error));
            toggleSound();
          }}
        >
          {isSoundEnabled ? (
            <Volume2Icon className="size-5" />
          ) : (
            <VolumeOffIcon className="size-5" />
          )}
        </button>

        {/* LOGOUT BTN */}
        <button
          className="text-[#aebac1] hover:text-[#e9edef] transition-colors"
          onClick={logout}
        >
          <LogOutIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}
export default ProfileHeader;
