import { useState, useEffect } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import "./ElectionMapView.css";

// 政治家データの型定義
interface Politician {
  chamber: "representatives" | "councillors" | "all";
  district: string;
  name: string;
  party: string;
  separateLastName: string;
  sameSexMarriage: string;
  electionYear: number;
}

interface ElectionMapViewProps {
  politicians: Politician[];
}

// 地図の色を定義
const colors = {
  賛成: "#2ecc71", // 緑
  反対: "#e74c3c", // 赤
  無回答: "#95a5a6", // グレー
  default: "#f0f0f0", // デフォルト（データなし）
};

const ElectionMapView = ({ politicians }: ElectionMapViewProps) => {
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<
    "separateLastName" | "sameSexMarriage"
  >("separateLastName");
  const [chamber, setChamber] = useState<
    "representatives" | "councillors" | "all"
  >("representatives");
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // 地図データを読み込む
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        console.log("Loading geo data...");
        const response = await fetch(
          "/yashinomi-map-viewer/geo/japan-election-districts.json"
        );
        if (!response.ok) {
          throw new Error("Failed to load geographic data");
        }
        const data = await response.json();
        console.log("GeoData loaded:", data);
        setGeoData(data);

        // Debugging info
        if (data && data.features) {
          const featureNames = data.features.map((f: any) => f.properties.name);
          setDebugInfo(featureNames);
        }
      } catch (err) {
        console.error("Error loading geographic data:", err);
        setError("地図データの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    loadGeoData();
  }, []);

  // 選挙区ごとの賛否状況を集計する関数
  const getDistrictStatus = (districtName: string) => {
    // 現在選択されている議院のデータにフィルタリング
    const filtered = politicians.filter(
      (politician) => chamber === "all" || politician.chamber === chamber
    );

    // 指定の選挙区に属する政治家を検索
    const districtPoliticians = filtered.filter(
      (politician) => politician.district === districtName
    );

    if (districtPoliticians.length === 0) {
      return "default";
    }

    // 賛成・反対・無回答の数をカウント
    const counts = {
      賛成: 0,
      反対: 0,
      無回答: 0,
    };

    // 現在の表示タイプに基づいて集計
    districtPoliticians.forEach((politician) => {
      const opinion =
        viewType === "separateLastName"
          ? politician.separateLastName
          : politician.sameSexMarriage;

      if (opinion === "賛成" || opinion === "反対" || opinion === "無回答") {
        counts[opinion]++;
      }
    });

    // 最も多い意見を返す
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as
      | "賛成"
      | "反対"
      | "無回答"
      | "default";
  };

  if (loading) {
    return <div className="loading-map">地図データを読み込み中...</div>;
  }

  if (error) {
    return <div className="error-map">{error}</div>;
  }

  if (!geoData) {
    return <div className="error-map">地図データを読み込めませんでした</div>;
  }

  console.log("Politicians count:", politicians.length);
  console.log("Current view type:", viewType);
  console.log("Current chamber:", chamber);

  return (
    <div className="election-map-container">
      <div className="controls">
        <div className="view-selector">
          <label>
            表示内容:
            <select
              value={viewType}
              onChange={(e) =>
                setViewType(
                  e.target.value as "separateLastName" | "sameSexMarriage"
                )
              }
            >
              <option value="separateLastName">選択的夫婦別姓</option>
              <option value="sameSexMarriage">同性婚</option>
            </select>
          </label>
        </div>

        <div className="chamber-selector">
          <label>
            議院:
            <select
              value={chamber}
              onChange={(e) =>
                setChamber(
                  e.target.value as "representatives" | "councillors" | "all"
                )
              }
            >
              <option value="representatives">衆議院</option>
              <option value="councillors">参議院</option>
              <option value="all">全体</option>
            </select>
          </label>
        </div>
      </div>

      <div className="map-wrapper">
        {/* デバッグ表示 */}
        <div
          className="debug-info"
          style={{
            position: "absolute",
            bottom: "10px",
            left: "10px",
            zIndex: 1000,
            background: "rgba(255,255,255,0.8)",
            padding: "5px",
            fontSize: "12px",
            maxHeight: "150px",
            overflow: "auto",
            borderRadius: "4px",
          }}
        >
          <strong>読み込まれた選挙区({debugInfo.length}):</strong>
          <ul style={{ margin: "5px 0", paddingLeft: "20px" }}>
            {debugInfo.map((name, i) => (
              <li key={i}>{name}</li>
            ))}
          </ul>
        </div>

        {/* SVGテスト - これが表示されるかどうか確認 */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 600"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            backgroundColor: "#e0e0e0",
            zIndex: 5,
          }}
        >
          <rect x="100" y="100" width="200" height="150" fill="red" />
          <rect x="400" y="200" width="200" height="150" fill="green" />
          <rect x="250" y="300" width="200" height="150" fill="blue" />
          <text x="50" y="50" fontSize="24" fill="black">
            テスト用SVG
          </text>
        </svg>

        {/* 本来の地図 */}
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 1500,
            center: [137, 38],
          }}
          style={{
            width: "100%",
            height: "100%",
            border: "1px solid #ddd",
            borderRadius: "4px",
            backgroundColor: "#f8f8f8",
            zIndex: 10,
          }}
        >
          <ZoomableGroup center={[137, 38]}>
            <Geographies geography={geoData}>
              {({ geographies }) => {
                console.log(`Rendering ${geographies.length} geographies`);
                return geographies.map((geo) => {
                  const districtName = geo.properties.name;
                  const status = getDistrictStatus(districtName);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={colors[status] || colors.default}
                      stroke="#FFFFFF"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: {
                          outline: "none",
                          fill: colors[status]
                            ? colors[status] + "cc"
                            : colors.default,
                        },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                });
              }}
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      <div className="legend">
        <div className="legend-item">
          <span
            className="color-box"
            style={{ backgroundColor: colors.賛成 }}
          ></span>
          <span>賛成</span>
        </div>
        <div className="legend-item">
          <span
            className="color-box"
            style={{ backgroundColor: colors.反対 }}
          ></span>
          <span>反対</span>
        </div>
        <div className="legend-item">
          <span
            className="color-box"
            style={{ backgroundColor: colors.無回答 }}
          ></span>
          <span>無回答</span>
        </div>
        <div className="legend-item">
          <span
            className="color-box"
            style={{ backgroundColor: colors.default }}
          ></span>
          <span>データなし</span>
        </div>
      </div>
    </div>
  );
};

export default ElectionMapView;
