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

  return (
    <>
      <div className="bg-slate-800/95 border-t border-slate-700/50 p-4 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 bg-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg p-3 transition-colors"
            title="Send image or video"
          >
            <ImageIcon className="w-5 h-5" />
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
            className="flex-1 min-w-0 bg-slate-700/50 border border-slate-600/50 rounded-lg py-3 px-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            placeholder="Type a message..."
          />

          <button
            type="submit"
            disabled={!text.trim() && !mediaPreview}
            className="flex-shrink-0 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg p-3 font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>

      {showMediaModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-200">
                {mediaType === "video" ? "Preview Video" : "Preview Image"}
              </h3>
              <button
                type="button"
                onClick={resetMedia}
                className="text-slate-400 hover:text-slate-200"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              {mediaType === "video" ? (
                <video src={mediaPreview} controls className="w-full h-64 rounded-lg object-cover bg-slate-950" />
              ) : (
                <img src={mediaPreview} alt="Preview" className="w-full h-64 object-cover rounded-lg" />
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">Add a caption (optional)</label>
              <textarea
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                placeholder="Type a caption..."
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={resetMedia}
                className="flex-1 px-4 py-3 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendFromModal}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg hover:from-cyan-600 hover:to-cyan-700 transition-all font-medium"
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
