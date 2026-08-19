import { useRef, useState } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, VideoIcon, XIcon } from "lucide-react";

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaType, setMediaType] = useState("image");
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaCaption, setMediaCaption] = useState("");

  const fileInputRef = useRef(null);

  const { sendMessage, isSoundEnabled } = useChatStore();

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() && !mediaPreview) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();

    sendMessage({
      text: text.trim(),
      image: mediaType === "image" ? mediaPreview : null,
      video: mediaType === "video" ? mediaPreview : null,
    });

    resetMedia();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Please select an image or video file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result);
      setMediaType(isVideo ? "video" : "image");
      setShowMediaModal(true);
    };
    reader.readAsDataURL(file);
  };

  const resetMedia = () => {
    setText("");
    setMediaPreview(null);
    setMediaType("image");
    setMediaCaption("");
    setShowMediaModal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendFromModal = () => {
    if (!mediaPreview) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();

    sendMessage({
      text: mediaCaption.trim(),
      image: mediaType === "image" ? mediaPreview : null,
      video: mediaType === "video" ? mediaPreview : null,
    });

    resetMedia();
  };

  const removeImage = () => {
    setMediaPreview(null);
    setMediaCaption("");
    setShowMediaModal(false);
  };

  return (
    <>
      <div className="bg-[#202c33] border-t border-[#2a3942] p-2 sm:p-3 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 text-[#8696a0] hover:text-[#e9edef] rounded-full p-2 transition-colors"
          >
            <ImageIcon className="w-6 h-6" />
          </button>

          <input
            type="file"
            accept="image/*,video/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <input
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              isSoundEnabled && playRandomKeyStrokeSound();
            }}
            className="flex-1 min-w-0 bg-[#2a3942] border border-[#3b4a54] rounded-full py-2.5 px-4 text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition-all text-sm"
            placeholder="Type a message..."
          />

          <button
            type="submit"
            disabled={!text.trim() && !mediaPreview}
            className="flex-shrink-0 bg-[#00a884] text-[#e9edef] rounded-full p-2.5 font-medium hover:bg-[#00a884]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Media Preview Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#202c33] rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-semibold text-[#e9edef] mb-4">Preview {mediaType === 'image' ? 'Image' : 'Video'}</h3>

            <div className="mb-4">
              {mediaType === 'image' ? (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-xl"
                />
              ) : (
                <video
                  src={mediaPreview}
                  controls
                  className="w-full h-64 object-cover rounded-xl bg-[#0b141a]"
                />
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm text-[#8696a0] mb-2">Add a caption (optional)</label>
              <textarea
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                placeholder="Type a caption..."
                className="w-full px-4 py-3 bg-[#2a3942] border border-[#3b4a54] rounded-xl text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] resize-none transition-all"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={removeImage}
                className="flex-1 px-4 py-3 bg-[#2a3942] text-[#e9edef] rounded-xl hover:bg-[#3b4a54] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSendFromModal}
                className="flex-1 px-4 py-3 bg-[#00a884] text-[#e9edef] rounded-xl hover:bg-[#00a884]/90 transition-all font-medium"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default MessageInput;
