import { useState, useEffect } from "react";
import "./App.css";
import ElectionMapView from "./components/ElectionMapView";

// 政治家データの型定義
interface Politician {
  chamber: "representatives" | "councillors" | "all";
  district: string;
  name: string;
  party: string;
  separateLastName: string; // For 選択的夫婦別姓
  sameSexMarriage: string; // For 同性婚
  electionYear: number;
}

function App() {
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 静的JSONファイルからデータを読み込む
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "/yashinomi-map-viewer/politicians/politicians.json"
        );
        if (!response.ok) {
          throw new Error("Failed to fetch politicians data");
        }
        const data = await response.json();
        setPoliticians(data);
        setError(null);
      } catch (err) {
        console.error("Error loading politicians data:", err);
        setError("データの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>ヤシノミマップ</h1>
        <p>選択的夫婦別姓と同性婚に関する国会議員の賛否を地図上で確認</p>
      </header>

      <main className="app-main">
        {loading ? (
          <div className="loading">データを読み込み中...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <ElectionMapView politicians={politicians} />
        )}
      </main>

      <footer className="app-footer">
        <p>
          データ提供:{" "}
          <a
            href="https://yashino.me/"
            target="_blank"
            rel="noopener noreferrer"
          >
            ヤシノミ作戦
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
