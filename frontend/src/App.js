import './App.css';
import LiveStreamViewer from './components/StreamViewer';


function App() {
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>Hệ thống Nhận diện Khuôn mặt thời gian thực</h1>
      </header>


      <div className="realtime-container">
        <LiveStreamViewer />
      </div>
    </div>
  );
}

export default App;