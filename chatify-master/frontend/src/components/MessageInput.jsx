import { useRef, useState } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon } from "lucide-react";

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageCaption, setImageCaption] = useState("");

  const fileInputRef = useRef(null);

  const { sendMessage, isSoundEnabled } = useChatStore();

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();

    sendMessage({
      text: text.trim(),
      image: imagePreview,
    });
    setText("");
    setImagePreview(null);
    setImageCaption("");
    setShowImageModal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setShowImageModal(true);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageCaption("");
    setShowImageModal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendFromModal = () => {
    if (!imagePreview) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();

    sendMessage({
      text: imageCaption.trim(),
      image: imagePreview,
    });
    setText("");
    setImagePreview(null);
    setImageCaption("");
    setShowImageModal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <div className="bg-slate-800/95 border-t border-slate-700/50 p-4 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 bg-slate-700/50 text-slate-400 hover:text-slate-200 rounded-lg p-3 transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
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
            disabled={!text.trim()}
            className="flex-shrink-0 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg p-3 font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Image Preview Modal */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-semibold text-slate-200 mb-4">Preview Image</h3>
            
            <div className="mb-4">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-2">Add a caption (optional)</label>
              <textarea
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                placeholder="Type a caption..."
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={removeImage}
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
