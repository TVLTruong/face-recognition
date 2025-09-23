const LiveStreamViewer = () => {
  return (
    <div>
      <img
        src="http://localhost:8000/video-feed"
        alt="Live Stream"
        style={{ width: '640px', height: '480px', border: '2px solid #ccc' }}
      />
    </div>
  );
};

export default LiveStreamViewer;
